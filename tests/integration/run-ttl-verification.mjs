// Fase 4C -- verificación específica de los nuevos intervalos ISR:
// (a) precio/stock/agotado/restauración también en inicio/categorías/
//     novedades/ofertas (no solo en la ficha de producto, que ya cubrían
//     los 22 escenarios de la Fase 4B.3),
// (b) permanencia en HIT después de superar los antiguos 60s sin ninguna
//     escritura administrativa de por medio,
// (c) invalidación bajo demanda con los nuevos TTL, en una entrada de
//     caché de antigüedad controlada (recién producida en esta misma
//     corrida, nunca una sobrante de un build anterior).
import { BASE_URL, psql, login, api, fetchPublic, now, results, record } from "./isr-invalidation.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FALLÓ: ${msg}`);
}

async function scenario(name, route, fn) {
  const t0 = now();
  try {
    const notes = await fn();
    record({ scenario: name, route, ms: now() - t0, pass: true, notes: notes ?? "" });
  } catch (err) {
    record({ scenario: name, route, ms: now() - t0, pass: false, notes: String(err.message ?? err) });
  }
}

function variantInStock(html, variantId, size) {
  const re = new RegExp(`${variantId}\\\\",\\\\"size\\\\":\\\\"${size}\\\\",\\\\"inStock\\\\":(true|false)`);
  const m = html.match(re);
  return m ? m[1] === "true" : null;
}

function productToInput(product, overrides) {
  const variantQuantities = {};
  for (const v of product.variants ?? []) variantQuantities[v.size] = v.stock;
  return {
    name: product.name,
    category: product.category,
    price: product.price,
    compareAt: product.compareAt ?? null,
    isVisible: product.isVisible,
    isNew: product.isNew,
    rating: product.rating,
    reviews: product.reviews,
    colors: product.colors,
    pattern: product.pattern,
    description: product.description,
    tags: product.tags ?? [],
    images: product.images ?? [],
    stockMode: product.stockMode,
    internalControl: product.internalControl,
    isCustomizable: product.isCustomizable,
    variantQuantities,
    patchIds: (product.patches ?? []).map((p) => p.id),
    ...overrides,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  await login();
  console.log(`\n== Fase 4C -- verificación de TTL contra ${BASE_URL} ==\n`);

  // ── (a) Cambio de precio: también en home/categoría/ofertas ─────────
  await scenario(
    "Precio: cambio en test-camiseta-oferta visible en ficha + /categoria/test-basket + /ofertas a la vez",
    "/ofertas",
    async () => {
      const beforeCat = await fetchPublic("/categoria/test-basket");
      const beforeOfertas = await fetchPublic("/ofertas");
      assert(beforeCat.body.includes("199.000") || beforeCat.body.includes("199000"), "precio original no visto en categoría");
      assert(beforeOfertas.body.includes("199.000") || beforeOfertas.body.includes("199000"), "precio original no visto en ofertas");

      const get = await api("GET", "/api/admin/products/p-test-oferta");
      await api("PUT", "/api/admin/products/p-test-oferta", productToInput(get.body, { price: 179000 }));

      const afterCat = await fetchPublic("/categoria/test-basket");
      const afterOfertas = await fetchPublic("/ofertas");
      const afterFicha = await fetchPublic("/producto/test-camiseta-oferta");
      assert(afterCat.body.includes("179.000") || afterCat.body.includes("179000"), "categoría no refleja el precio nuevo de inmediato");
      assert(afterOfertas.body.includes("179.000") || afterOfertas.body.includes("179000"), "/ofertas no refleja el precio nuevo de inmediato");
      assert(afterFicha.body.includes("179.000") || afterFicha.body.includes("179000"), "la ficha no refleja el precio nuevo de inmediato");

      const get2 = await api("GET", "/api/admin/products/p-test-oferta");
      await api("PUT", "/api/admin/products/p-test-oferta", productToInput(get2.body, { price: 199000 }));
      return `las 3 rutas (ficha, categoría TTL=900s, ofertas TTL=300s) reflejaron el precio nuevo de inmediato, sin importar que sus TTL son distintos entre sí`;
    },
  );

  // ── (a) Stock -> agotado -> restaurado: también en home/categoría ───
  await scenario(
    "Stock: agotar test-camiseta-visible (M) se ve en / y /categoria/test-futbol a la vez",
    "/ , /categoria/test-futbol",
    async () => {
      const beforeHome = await fetchPublic("/");
      const beforeCat = await fetchPublic("/categoria/test-futbol");
      assert(variantInStock(beforeHome.body, "pv-test-visible-m", "M") === true, "no debería estar agotado en home todavía");
      assert(variantInStock(beforeCat.body, "pv-test-visible-m", "M") === true, "no debería estar agotado en categoría todavía");

      await api("POST", "/api/admin/inventory/movements", {
        variantId: "pv-test-visible-m",
        mode: "correction",
        quantity: 0,
        note: "Fase 4C -- agotar a propósito",
      });
      const dbZero = psql(`select stock_on_hand from product_variants where id='pv-test-visible-m';`);
      assert(dbZero === "0", "el stock no quedó en 0 en Postgres");

      const afterHome = await fetchPublic("/");
      const afterCat = await fetchPublic("/categoria/test-futbol");
      assert(variantInStock(afterHome.body, "pv-test-visible-m", "M") === false, "home no muestra agotado de inmediato (TTL=900s)");
      assert(variantInStock(afterCat.body, "pv-test-visible-m", "M") === false, "categoría no muestra agotado de inmediato (TTL=900s)");

      await api("POST", "/api/admin/inventory/movements", {
        variantId: "pv-test-visible-m",
        mode: "correction",
        quantity: 13,
        note: "Fase 4C -- restaurar stock original",
      });
      const dbRestored = psql(`select stock_on_hand from product_variants where id='pv-test-visible-m';`);
      assert(dbRestored === "13", "el stock no se restauró en Postgres");
      const restoredHome = await fetchPublic("/");
      const restoredCat = await fetchPublic("/categoria/test-futbol");
      assert(variantInStock(restoredHome.body, "pv-test-visible-m", "M") === true, "home sigue mostrando agotado tras restaurar");
      assert(variantInStock(restoredCat.body, "pv-test-visible-m", "M") === true, "categoría sigue mostrando agotado tras restaurar");

      return "agotado y restaurado reflejados de inmediato en home (TTL=900s) y categoría (TTL=900s) a la vez, confirmado en Postgres en cada paso";
    },
  );

  // ── Novedades: alta de producto nuevo ────────────────────────────────
  await scenario("Novedades: producto nuevo visible de inmediato (TTL=900s)", "/novedades", async () => {
    const before = await fetchPublic("/novedades");
    assert(!before.body.includes("Producto Nuevo Fase 4C"), "no debería existir todavía");
    const create = await api("POST", "/api/admin/products", {
      slug: "test-producto-novedad-4c",
      name: "Producto Nuevo Fase 4C",
      category: "test-futbol",
      price: 100000,
      isNew: true,
      colors: { primary: "#000", secondary: "#111", accent: "#222" },
      pattern: "solid",
      description: "Creado por la Fase 4C para probar /novedades.",
      stockMode: "ajeno",
    });
    assert(create.status === 201, `creación falló: ${JSON.stringify(create.body)}`);
    const after = await fetchPublic("/novedades");
    assert(after.body.includes("Producto Nuevo Fase 4C"), "novedades no muestra el producto nuevo de inmediato");
    await api("DELETE", `/api/admin/products/${create.body.id}`);
    return "producto con isNew:true aparece en /novedades de inmediato (TTL=900s)";
  });

  // ── (b) Permanencia en HIT superando los antiguos 60s, sin escrituras ─
  await scenario(
    "Permanencia: /ofertas (TTL=300s, el más corto) sigue en HIT después de 70s sin ninguna escritura administrativa",
    "/ofertas",
    async () => {
      // "Calienta" la entrada para asegurar que está fresca y es HIT antes
      // de empezar a medir -- si ya viniera en MISS/STALE de un escenario
      // anterior, la comparación no probaría nada.
      await fetchPublic("/ofertas");
      const warm = await fetchPublic("/ofertas");
      assert(warm.cache === "HIT", `se esperaba HIT antes de medir, llegó ${warm.cache}`);
      const contentBefore = warm.body;

      const waitMs = 70_000;
      const t0 = now();
      await sleep(waitMs);
      const elapsed = now() - t0;

      // Ninguna escritura administrativa ocurrió durante la espera -- el
      // único cambio posible en este lapso sería por vencimiento del TTL
      // (imposible con 300s) o por un background-regenerate disparado por
      // OTRO visitante (no hay otro tráfico en este entorno aislado).
      const after = await fetchPublic("/ofertas");
      assert(after.cache === "HIT", `se esperaba que siguiera en HIT tras ${elapsed}ms sin escrituras, llegó ${after.cache} -- con el TTL viejo de 60s esto ya habría sido MISS/STALE`);
      assert(after.body === contentBefore, "el contenido cambió sin ninguna escritura administrativa -- inesperado");

      return `esperados ${elapsed}ms (> los 60000ms del TTL viejo) sin ninguna escritura -- /ofertas (el TTL más corto de los nuevos, 300s) siguió en HIT con el MISMO contenido. Con el TTL anterior (60s) esta misma espera ya habría forzado una regeneración.`;
    },
  );

  // ── (c) Invalidación bajo demanda, entrada de antigüedad controlada ──
  await scenario(
    "Invalidación bajo demanda: la MISMA ruta de arriba, ahora con una escritura real, se actualiza en segundos (no son los 300s del TTL)",
    "/ofertas",
    async () => {
      const before = await fetchPublic("/ofertas");
      assert(before.cache === "HIT", "se esperaba HIT (la misma entrada recién confirmada arriba, antigüedad conocida: unos pocos segundos)");

      const get = await api("GET", "/api/admin/products/p-test-oferta");
      const t0 = now();
      await api("PUT", "/api/admin/products/p-test-oferta", productToInput(get.body, { price: 150000 }));
      const after = await fetchPublic("/ofertas");
      const elapsed = now() - t0;

      assert(after.cache !== "HIT", `se esperaba que dejara de ser HIT de inmediato, llegó ${after.cache}`);
      assert(after.body.includes("150.000") || after.body.includes("150000"), "no refleja el precio nuevo de inmediato");
      assert(elapsed < 5000, `la actualización tardó ${elapsed}ms -- debería ser casi instantánea, muy por debajo del TTL de 300s`);

      const get2 = await api("GET", "/api/admin/products/p-test-oferta");
      await api("PUT", "/api/admin/products/p-test-oferta", productToInput(get2.body, { price: 199000 }));

      return `actualización confirmada en ${elapsed}ms -- la entrada tenía unos pocos segundos de antigüedad (no 300s), así que esto es invalidación bajo demanda, no vencimiento del TTL`;
    },
  );

  console.log("\n== Resumen (verificación de TTL, Fase 4C) ==");
  const pass = results.filter((r) => r.pass).length;
  console.log(`${pass}/${results.length} OK`);
  for (const r of results) console.log(`[${r.pass ? "OK" : "FAIL"}] ${r.scenario} (${r.ms}ms) -- ${r.notes}`);
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
