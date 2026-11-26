// Fase 4B.3 -- corre TODOS los escenarios priorizados contra el servidor
// de producción aislado (start:test, :3100) y Supabase local. Ver
// isr-invalidation.mjs para los helpers compartidos y el contrato de
// aislamiento (guard obligatorio antes de cualquier escritura).
//
// Uso: node tests/integration/run-scenarios.mjs
// Requiere: supabase local corriendo + seed aplicado + start:test en :3100.
import { BASE_URL, psql, psqlExec, login, api, apiForm, fetchPublic, now, results, record, waitUntil } from "./isr-invalidation.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FALLÓ: ${msg}`);
}

const WHOLESALE_KEY = "wholesale";
let wholesaleRestoreFailure = null;

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

/** Captura la fila física: `exists` diferencia ausencia de `value: null`.
 * `site_settings.value` es JSONB NOT NULL, así que SQL NULL no es posible,
 * pero el JSON literal null sí es representable y se conserva tal cual. */
function captureWholesaleRow() {
  const raw = psql(
    `select json_build_object('key', key, 'value', value, 'updatedAt', updated_at)::text from site_settings where key='${WHOLESALE_KEY}';`,
  );
  if (!raw) return { exists: false };

  const row = JSON.parse(raw);
  assert(row.key === WHOLESALE_KEY, "la captura cruda devolvió una key inesperada");
  assert(typeof row.updatedAt === "string", "la captura cruda no incluye updated_at");
  return { exists: true, value: row.value, updatedAt: row.updatedAt };
}

function assertWholesaleRowEquals(actual, expected) {
  assert(actual.exists === expected.exists, "la existencia de wholesale no se restauró");
  if (!expected.exists) return;
  assert(stableJson(actual.value) === stableJson(expected.value), "el JSON crudo de wholesale no se restauró");
  assert(actual.updatedAt === expected.updatedAt, "updated_at de wholesale no se restauró");
}

/** Restaura las únicas tres columnas del esquema. No se usa UPDATE porque el
 * trigger site_settings_set_updated_at reemplaza el timestamp capturado. */
function restoreWholesaleRow(snapshot) {
  if (!snapshot.exists) {
    psqlExec(`delete from site_settings where key='${WHOLESALE_KEY}';`);
  } else {
    const value = sqlLiteral(JSON.stringify(snapshot.value));
    const updatedAt = sqlLiteral(snapshot.updatedAt);
    psqlExec(
      `delete from site_settings where key='${WHOLESALE_KEY}'; ` +
      `insert into site_settings (key, value, updated_at) values ('${WHOLESALE_KEY}', ${value}::jsonb, ${updatedAt}::timestamptz);`,
    );
  }
  assertWholesaleRowEquals(captureWholesaleRow(), snapshot);
}

function htmlText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

/** Comprueba la restauración visible sin comparar el HTML completo. El
 * banner de home es opcional: si está apagado, page-reveal es la estructura
 * estable que confirma una home real; si está prendido, también se exige su
 * contenedor y, cuando no está vacío, su título original. */
function assertRestoredWholesalePages(home, mayorista, originalPublicValue) {
  assert(home.status === 200, `/ debe responder 200 tras restaurar wholesale, llegó ${home.status}`);
  assert(mayorista.status === 200, `/mayorista debe responder 200 tras restaurar wholesale, llegó ${mayorista.status}`);
  assert(!home.body.includes("Banner Fase 7B.1"), "/ quedó con contenido wholesale obsoleto tras restaurar");
  assert(!mayorista.body.includes("Mayorista Fase 7B.1"), "/mayorista quedó con contenido wholesale obsoleto tras restaurar");

  assert(home.body.includes("page-reveal"), "/ no conserva su estructura pública estable tras restaurar");
  assert(mayorista.body.includes("custom__copy"), "/mayorista no conserva su estructura pública estable tras restaurar");

  const mayoristaTitle = typeof originalPublicValue.title === "string" ? originalPublicValue.title : "";
  if (mayoristaTitle) {
    assert(mayorista.body.includes(htmlText(mayoristaTitle)), "/mayorista no refleja su título original tras restaurar");
  } else {
    // Un título vacío es válido: se confirma el h1 estructural, no texto
    // inventado ni un HTML completo frágil.
    assert(mayorista.body.includes('class="h1"'), "/mayorista no conserva el h1 estructural tras restaurar");
  }

  const homeBannerEnabled = originalPublicValue.homeBannerEnabled === true;
  const hasHomeBanner = home.body.includes("wholesale-cta");
  assert(hasHomeBanner === homeBannerEnabled, "/ no coincide con el estado original de homeBannerEnabled");
  if (homeBannerEnabled) {
    assert(home.body.includes("wholesale-cta__inner"), "/ no conserva la estructura del banner mayorista original");
    const homeBannerTitle = typeof originalPublicValue.homeBannerTitle === "string" ? originalPublicValue.homeBannerTitle : "";
    if (homeBannerTitle) {
      assert(home.body.includes(htmlText(homeBannerTitle)), "/ no refleja el título original del banner mayorista");
    }
  }
}

/** La restauración cruda evita fusionar defaults. Antes de ella se hace un
 * PUT administrativo válido con el GET original para conservar la
 * invalidación global existente; luego se repone la fila física exacta y se
 * comprueba que / y /mayorista ya no sirven el valor de prueba. */
async function invalidateAndRestoreWholesale(snapshot, originalPublicValue) {
  const invalidate = await api("PUT", `/api/admin/settings/${WHOLESALE_KEY}`, originalPublicValue);
  assert(invalidate.status === 200, `no se pudo invalidar antes de restaurar wholesale: ${JSON.stringify(invalidate.body)}`);

  restoreWholesaleRow(snapshot);

  const restored = await api("GET", `/api/admin/settings/${WHOLESALE_KEY}`);
  assert(restored.status === 200, `GET wholesale posterior a restauración falló: ${JSON.stringify(restored.body)}`);
  assert(stableJson(restored.body) === stableJson(originalPublicValue), "GET wholesale posterior no coincide con el valor público original");

  const [home, mayorista] = await Promise.all([fetchPublic("/"), fetchPublic("/mayorista")]);
  assertRestoredWholesalePages(home, mayorista, originalPublicValue);
}

/** Estado de UNA talla puntual en el payload de la ficha de producto --
 * a diferencia de buscar "Agotad" en toda la página (que también puede
 * matchear el badge de OTRO producto en la grilla de "relacionados"),
 * esto ancla al id de esa variante específica. Devuelve null si no
 * encuentra la variante en la página (ej. producto inexistente/oculto). */
function variantInStock(html, variantId, size) {
  const re = new RegExp(`${variantId}\\\\",\\\\"size\\\\":\\\\"${size}\\\\",\\\\"inStock\\\\":(true|false)`);
  const m = html.match(re);
  return m ? m[1] === "true" : null;
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

async function testWholesale() {
  // Antes de la Fase 7B.1, layout.tsx y page.tsx (home) pedían
  // "wholesale" por separado (dos consultas reales); mayorista/page.tsx
  // también la pide por su cuenta. Este escenario no mide consultas
  // (eso ya se hizo en el worktree descartable de la fase) -- solo
  // confirma que memoizar por clave con React.cache() no introdujo
  // ninguna inconsistencia entre las DOS páginas que la necesitan: cada
  // una sigue viendo el valor fresco, en su propio request.
  const rawBefore = captureWholesaleRow();
  const current = await api("GET", "/api/admin/settings/wholesale");
  assert(current.status === 200, `GET wholesale falló: ${JSON.stringify(current.body)}`);
  let originalError;
  let writeAttempted = false;
  try {
    writeAttempted = true;
    const put = await api("PUT", "/api/admin/settings/wholesale", {
      ...current.body,
      title: "Mayorista Fase 7B.1",
      homeBannerTitle: "Banner Fase 7B.1",
      homeBannerEnabled: true,
    });
    assert(put.status === 200, `PUT wholesale falló: ${JSON.stringify(put.body)}`);

    const mayorista = await fetchPublic("/mayorista");
    assert(mayorista.body.includes("Mayorista Fase 7B.1"), "/mayorista no refleja el título nuevo de inmediato");

    const home = await fetchPublic("/");
    assert(home.body.includes("Banner Fase 7B.1"), "/ no refleja el banner nuevo de inmediato");

    return "una sola actualización de \"wholesale\" se refleja correctamente en / y /mayorista a la vez, sin staleness ni inconsistencia entre ambas";
  } catch (err) {
    // Si una aserción falla después del PUT, el error original sigue siendo
    // el resultado del escenario; finally igual intenta devolver el fixture
    // a su estado inicial.
    originalError = err;
    throw err;
  } finally {
    if (writeAttempted) {
      try {
        await invalidateAndRestoreWholesale(rawBefore, current.body);
      } catch (restoreError) {
        // No reemplazar una falla funcional previa: se registra por separado
        // que el entorno puede haber quedado contaminado y se conserva la
        // causa original. main() se detiene antes de escenarios dependientes.
        wholesaleRestoreFailure = restoreError;
        console.error("No se pudo restaurar wholesale tras el escenario:", restoreError);
        if (!originalError) throw restoreError;
      }
    }
  }
}

async function main() {
  await login();
  console.log(`\n== Fase 4B.3 -- escenarios contra ${BASE_URL} ==\n`);

  // ── PRODUCTOS ────────────────────────────────────────────────────────
  await scenario("Producto: creación", "/categoria/test-futbol", async () => {
    const before = await fetchPublic("/categoria/test-futbol");
    assert(!before.body.includes("p-test-nuevo-scenario"), "no debería existir todavía");
    const unrelatedBefore = await fetchPublic("/mayorista");

    const { status, body } = await api("POST", "/api/admin/products", {
      slug: "test-producto-creado-escenario",
      name: "Producto Creado En Escenario",
      category: "test-futbol",
      price: 123000,
      colors: { primary: "#000000", secondary: "#111111", accent: "#222222" },
      pattern: "solid",
      description: "Creado por la Fase 4B.3, se borra al final.",
      stockMode: "ajeno",
    });
    assert(status === 201, `esperaba 201, llegó ${status}: ${JSON.stringify(body)}`);
    const dbRow = psql(`select slug from products where slug='test-producto-creado-escenario';`);
    assert(dbRow === "test-producto-creado-escenario", "no se encontró en Postgres local");

    const after = await fetchPublic("/categoria/test-futbol");
    assert(after.body.includes("Producto Creado En Escenario"), "la categoría no muestra el producto nuevo de inmediato");
    const unrelatedAfter = await fetchPublic("/mayorista");
    assert(unrelatedAfter.cache !== "MISS", "mayorista no debería re-generarse por esto");

    // limpieza
    const delRes = await api("GET", "/api/admin/products");
    const created = delRes.body.find((p) => p.slug === "test-producto-creado-escenario");
    await api("DELETE", `/api/admin/products/${created.id}`);
    return `cache /mayorista antes=${unrelatedBefore.cache} después=${unrelatedAfter.cache}`;
  });

  await scenario("Producto: cambio de precio", "/producto/test-camiseta-visible", async () => {
    const before = await fetchPublic("/producto/test-camiseta-visible");
    assert(before.body.includes("280.000") || before.body.includes("280000"), "precio original no encontrado");
    const cacheBefore = before.cache;

    const get = await api("GET", "/api/admin/products/p-test-visible");
    const product = get.body;
    const t0 = now();
    const put = await api("PUT", "/api/admin/products/p-test-visible", productToInput(product, { price: 299000 }));
    assert(put.status === 200, `PUT falló: ${JSON.stringify(put.body)}`);
    const writeMs = now() - t0;

    const dbPrice = psql(`select price from products where id='p-test-visible';`);
    assert(dbPrice === "299000.00" || dbPrice === "299000", `precio en DB no actualizado: ${dbPrice}`);

    const t1 = now();
    const after = await fetchPublic("/producto/test-camiseta-visible");
    const readMs = now() - t1;
    assert(after.body.includes("299.000") || after.body.includes("299000"), "precio nuevo no aparece de inmediato");
    assert(!after.body.includes("280.000"), "precio viejo todavía aparece");

    // restaurar
    await api("PUT", "/api/admin/products/p-test-visible", productToInput(product, { price: 280000 }));

    return `cache antes=${cacheBefore} cache después=${after.cache} escritura=${writeMs}ms lectura-post=${readMs}ms (<<60000ms TTL)`;
  });

  await scenario("Producto: cambio de slug", "/producto/test-camiseta-visible", async () => {
    const get = await api("GET", "/api/admin/products/p-test-visible");
    const product = get.body;
    const oldSlug = product.slug;
    const newSlug = "test-camiseta-visible-renombrada";

    const put = await api("PUT", "/api/admin/products/p-test-visible", productToInput(product, {}, newSlug));
    assert(put.status === 200, `PUT falló: ${JSON.stringify(put.body)}`);

    const dbSlug = psql(`select slug from products where id='p-test-visible';`);
    assert(dbSlug === newSlug, `slug en DB no actualizado: ${dbSlug}`);

    const oldPage = await fetchPublic(`/producto/${oldSlug}`);
    const newPage = await fetchPublic(`/producto/${newSlug}`);
    assert(oldPage.status === 404, `la URL vieja debería 404 de inmediato, llegó ${oldPage.status}`);
    assert(newPage.status === 200, `la URL nueva debería responder, llegó ${newPage.status}`);

    // restaurar
    const get2 = await api("GET", "/api/admin/products/p-test-visible");
    await api("PUT", "/api/admin/products/p-test-visible", productToInput(get2.body, {}, oldSlug));
    const restored = await fetchPublic(`/producto/${oldSlug}`);
    assert(restored.status === 200, "no se pudo restaurar el slug original");

    return `vieja=${oldPage.status} nueva=${newPage.status}`;
  });

  await scenario("Producto: cambio de categoría", "/categoria/test-basket", async () => {
    const beforeOld = await fetchPublic("/categoria/test-futbol");
    const beforeNew = await fetchPublic("/categoria/test-basket");
    assert(beforeOld.body.includes("Camiseta de Prueba Visible"), "debería estar en la categoría vieja todavía");
    assert(!beforeNew.body.includes("Camiseta de Prueba Visible"), "no debería estar en la nueva todavía");

    const get = await api("GET", "/api/admin/products/p-test-visible");
    await api("PUT", "/api/admin/products/p-test-visible", productToInput(get.body, { category: "test-basket" }));

    const afterOld = await fetchPublic("/categoria/test-futbol");
    const afterNew = await fetchPublic("/categoria/test-basket");
    assert(!afterOld.body.includes("Camiseta de Prueba Visible"), "sigue en la categoría vieja");
    assert(afterNew.body.includes("Camiseta de Prueba Visible"), "no aparece en la nueva categoría");

    // restaurar
    const get2 = await api("GET", "/api/admin/products/p-test-visible");
    await api("PUT", "/api/admin/products/p-test-visible", productToInput(get2.body, { category: "test-futbol" }));

    return "categoría vieja y nueva reflejan el cambio de inmediato en ambos sentidos";
  });

  await scenario("Producto: ocultación", "/producto/test-camiseta-novedad", async () => {
    const before = await fetchPublic("/producto/test-camiseta-novedad");
    assert(before.status === 200, "debería existir antes de ocultar");
    const homeBefore = await fetchPublic("/");
    assert(homeBefore.body.includes("Camiseta de Prueba Nueva"), "debería verse en novedades/home antes");

    await api("PATCH", "/api/admin/products/p-test-novedad", { isVisible: false });

    const after = await fetchPublic("/producto/test-camiseta-novedad");
    assert(after.status === 404, `debería 404 de inmediato, llegó ${after.status}`);
    const homeAfter = await fetchPublic("/");
    assert(!homeAfter.body.includes("Camiseta de Prueba Nueva"), "sigue visible en home tras ocultar");

    await api("PATCH", "/api/admin/products/p-test-novedad", { isVisible: true });
    const restored = await fetchPublic("/producto/test-camiseta-novedad");
    assert(restored.status === 200, "no se restauró la visibilidad");

    return `antes=${before.status} después=${after.status} restaurado=${restored.status}`;
  });

  await scenario("Producto: eliminación", "/producto/test-producto-a-borrar", async () => {
    const create = await api("POST", "/api/admin/products", {
      slug: "test-producto-a-borrar",
      name: "Producto A Borrar",
      category: "test-futbol",
      price: 50000,
      colors: { primary: "#000", secondary: "#111", accent: "#222" },
      pattern: "solid",
      description: "Se crea y se borra en el mismo escenario.",
      stockMode: "ajeno",
    });
    assert(create.status === 201, "no se pudo crear para después borrar");
    const id = create.body.id;
    const before = await fetchPublic("/producto/test-producto-a-borrar");
    assert(before.status === 200, "debería existir antes de borrar");

    const del = await api("DELETE", `/api/admin/products/${id}`);
    assert(del.status === 200, `DELETE falló: ${JSON.stringify(del.body)}`);
    const dbRow = psql(`select count(*) from products where id='${id}';`);
    assert(dbRow === "0", "sigue existiendo en Postgres");

    const after = await fetchPublic("/producto/test-producto-a-borrar");
    assert(after.status === 404, `debería 404 de inmediato, llegó ${after.status}`);
    return "creado, confirmado visible, eliminado, confirmado 404 de inmediato";
  });

  await scenario("Producto: cambio de disponibilidad (agotado/restaurado)", "/producto/test-camiseta-oferta", async () => {
    const before = await fetchPublic("/producto/test-camiseta-oferta");
    assert(variantInStock(before.body, "pv-test-oferta-m", "M") === true, "la talla M no debería estar agotada todavía");

    await api("POST", "/api/admin/inventory/movements", {
      variantId: "pv-test-oferta-m",
      mode: "correction",
      quantity: 0,
      note: "Fase 4B.3 -- agotar a propósito",
    });
    const stockZero = psql(`select stock_on_hand from product_variants where id='pv-test-oferta-m';`);
    assert(stockZero === "0", "el stock no quedó en 0 en la DB");

    const afterZero = await fetchPublic("/producto/test-camiseta-oferta");
    assert(variantInStock(afterZero.body, "pv-test-oferta-m", "M") === false, "no muestra agotado de inmediato tras poner el stock en 0");

    await api("POST", "/api/admin/inventory/movements", {
      variantId: "pv-test-oferta-m",
      mode: "correction",
      quantity: 20,
      note: "Fase 4B.3 -- restaurar stock original",
    });
    const stockRestored = psql(`select stock_on_hand from product_variants where id='pv-test-oferta-m';`);
    assert(stockRestored === "20", "el stock no se restauró en la DB");
    const afterRestore = await fetchPublic("/producto/test-camiseta-oferta");
    assert(variantInStock(afterRestore.body, "pv-test-oferta-m", "M") === true, "sigue mostrando agotado tras restaurar stock");

    return "agotado al poner stock en 0, disponible de nuevo tras restaurar -- ambos reflejados de inmediato";
  });

  // ── VENTAS E INVENTARIO ──────────────────────────────────────────────
  let saleId = null;
  await scenario("Venta: registro (vende todo el stock de una talla)", "/producto/test-camiseta-visible", async () => {
    const before = await fetchPublic("/producto/test-camiseta-visible");
    assert(variantInStock(before.body, "pv-test-visible-l", "L") === true, "la talla L no debería estar agotada todavía");
    const stockBefore = psql(`select stock_on_hand from product_variants where id='pv-test-visible-l';`);
    assert(stockBefore === "8", `se esperaba stock inicial 8, hay ${stockBefore}`);

    const res = await api("POST", "/api/admin/sales", {
      channel: "store",
      items: [
        {
          variantId: "pv-test-visible-l",
          productId: "p-test-visible",
          quantity: 8,
          unitPrice: 280000,
          costPrice: 120000,
        },
      ],
    });
    assert(res.status === 201, `registrar venta falló: ${JSON.stringify(res.body)}`);
    saleId = res.body.id;

    const stockAfter = psql(`select stock_on_hand from product_variants where id='pv-test-visible-l';`);
    assert(stockAfter === "0", `stock no bajó a 0 en la DB, hay ${stockAfter}`);
    const after = await fetchPublic("/producto/test-camiseta-visible");
    assert(variantInStock(after.body, "pv-test-visible-l", "L") === false, "la talla L no aparece agotada de inmediato tras la venta");

    return `stock L: 8 -> ${stockAfter}, venta ${saleId}`;
  });

  await scenario("Venta: edición (reduce cantidad, repone parte del stock)", "/producto/test-camiseta-visible", async () => {
    assert(saleId, "depende del escenario anterior (registro de venta)");
    const res = await api("PUT", `/api/admin/sales/${saleId}`, {
      channel: "store",
      items: [
        {
          variantId: "pv-test-visible-l",
          productId: "p-test-visible",
          quantity: 4,
          unitPrice: 280000,
          costPrice: 120000,
        },
      ],
    });
    assert(res.status === 200, `editar venta falló: ${JSON.stringify(res.body)}`);
    const stockAfter = psql(`select stock_on_hand from product_variants where id='pv-test-visible-l';`);
    assert(stockAfter === "4", `se esperaba stock 4 tras la edición, hay ${stockAfter}`);
    const after = await fetchPublic("/producto/test-camiseta-visible");
    assert(variantInStock(after.body, "pv-test-visible-l", "L") === true, "sigue mostrando agotado tras reducir la cantidad vendida");
    return `stock L vuelve a estar disponible (4 unidades) tras editar la venta`;
  });

  await scenario("Venta: eliminación (repone todo el stock restante)", "/producto/test-camiseta-visible", async () => {
    assert(saleId, "depende de los escenarios anteriores");
    const res = await api("DELETE", `/api/admin/sales/${saleId}`);
    assert(res.status === 200, `eliminar venta falló: ${JSON.stringify(res.body)}`);
    const stockAfter = psql(`select stock_on_hand from product_variants where id='pv-test-visible-l';`);
    assert(stockAfter === "8", `se esperaba volver a 8 tras eliminar la venta, hay ${stockAfter}`);
    return "stock L restaurado a su valor original (8) tras eliminar la venta";
  });

  await scenario("Importación CSV de ventas (global, sin tocar stock en vivo)", "/mayorista", async () => {
    // importHistoricalSales() (lib/data.ts) inserta directo en sales/
    // sale_items con variant_id=null -- a propósito, NUNCA pasa por
    // record_sale()/el trigger que descuenta stock (comentario del propio
    // código: "Las ventas importadas NO se linkean a product_variants").
    // Es un registro histórico puro, no una venta en vivo -- por eso este
    // escenario verifica la fila en Postgres y la invalidación global
    // (el fix de la Fase 4B.1), NO un cambio de stock/disponibilidad.
    const stockBefore = psql(`select stock_on_hand from product_variants where id='pv-test-oferta-m';`);
    const before = await fetchPublic("/mayorista");

    const csv =
      "fecha,producto,talla,cantidad,precio compra,precio venta,canal\n" +
      "25/11/2026,Camiseta de Prueba en Oferta,M,3,120000,199000,Tienda física\n";
    const form = new FormData();
    form.append("file", new Blob([csv], { type: "text/csv" }), "ventas.csv");
    const res = await apiForm("POST", "/api/admin/sales/import", form);
    assert(res.status === 200, `importación CSV falló: ${JSON.stringify(res.body)}`);
    assert(res.body.imported === 1, `se esperaba 1 fila importada, llegó ${JSON.stringify(res.body)}`);

    const importedRow = psql(
      `select count(*) from sale_items where product_name_snapshot='Camiseta de Prueba en Oferta' and quantity=3;`,
    );
    assert(importedRow === "1", "la fila importada no se encuentra en Postgres local");

    const stockAfter = psql(`select stock_on_hand from product_variants where id='pv-test-oferta-m';`);
    assert(stockAfter === stockBefore, `el stock en vivo NO debería cambiar (quedó en ${stockAfter}, antes ${stockBefore}) -- la importación histórica no toca product_variants por diseño`);

    const after = await fetchPublic("/mayorista");
    assert(after.cache !== "HIT", `se esperaba que /mayorista se re-generara por la invalidación global del import (cache=${after.cache})`);

    return `fila confirmada en Postgres (quantity=3), stock en vivo sin cambios (${stockBefore} -- correcto, es un registro histórico), /mayorista se re-generó por la invalidación global (cache ${before.cache}->${after.cache}). La venta importada queda en la base local -- se limpia con el reset final.`;
  });

  // ── CONFIGURACIÓN ────────────────────────────────────────────────────
  await scenario("Settings: branding (favicon/logo)", "/mayorista", async () => {
    const before = await fetchPublic("/mayorista");
    assert(!before.body.includes("https://ejemplo.test/logo-4b3.png"), "no debería estar todavía");
    await api("PUT", "/api/admin/settings/branding", { faviconUrl: "https://ejemplo.test/logo-4b3.png" });
    const after = await fetchPublic("/mayorista");
    assert(after.body.includes("https://ejemplo.test/logo-4b3.png"), "el logo nuevo no aparece en el JSON-LD de inmediato");
    await api("PUT", "/api/admin/settings/branding", { faviconUrl: "" });
    return "branding es global: /mayorista (no relacionada con productos) refleja el cambio igual";
  });

  await scenario("Settings: wholesale -- la misma actualización se refleja en / Y /mayorista (Fase 7B.1: memoización por clave)", "/ , /mayorista", async () => {
    return testWholesale();
  });
  if (wholesaleRestoreFailure) throw wholesaleRestoreFailure;

  await scenario("Settings: footer (whatsapp/brandDescription)", "/personalizacion", async () => {
    const before = await fetchPublic("/personalizacion");
    assert(before.body.includes("595900000000"), "debería tener ya el número sintético original");
    // PUT exige la forma COMPLETA del setting (matchesShape en
    // app/api/admin/settings/[key]/route.ts) -- un body parcial como
    // {whatsappNumber, brandDescription} solo no matchea la forma de
    // FooterSettings y el PUT devuelve 400 en silencio si no se chequea el
    // status (bug real de este script, no de la app -- se corrigió
    // trayendo primero el valor actual completo vía GET).
    const current = await api("GET", "/api/admin/settings/footer");
    const put1 = await api("PUT", "/api/admin/settings/footer", {
      ...current.body,
      whatsappNumber: "595911111111",
    });
    assert(put1.status === 200, `PUT footer falló: ${JSON.stringify(put1.body)}`);
    const after = await fetchPublic("/personalizacion");
    assert(after.body.includes("595911111111"), "footer no refleja el nuevo whatsapp de inmediato");
    const restore = await api("PUT", "/api/admin/settings/footer", current.body);
    assert(restore.status === 200, `no se pudo restaurar footer: ${JSON.stringify(restore.body)}`);
    return "footer global: cambia en una página sin productos (/personalizacion)";
  });

  await scenario("Settings: página informativa -- edición de body (selectiva)", "/pagina/test-envios", async () => {
    const before = await fetchPublic("/pagina/test-envios");
    const unrelatedBefore = await fetchPublic("/mayorista");
    await api("PUT", "/api/admin/pages/test-envios", {
      title: "Envíos (prueba)",
      body: "Texto editado por la Fase 4B.3.",
      placement: "ayuda",
      sortOrder: 0,
    });
    const after = await fetchPublic("/pagina/test-envios");
    assert(after.body.includes("Texto editado por la Fase 4B.3."), "la página no refleja el nuevo body de inmediato");
    const unrelatedAfter = await fetchPublic("/mayorista");
    await api("PUT", "/api/admin/pages/test-envios", {
      title: "Envíos (prueba)",
      body: "Página informativa sintética de envíos -- Fase 4B.2.",
      placement: "ayuda",
      sortOrder: 0,
    });
    return `edición de solo "body": selectiva -- cache /mayorista antes=${unrelatedBefore.cache} después=${unrelatedAfter.cache}`;
  });

  await scenario("Settings: página informativa -- edición de título (global, afecta Footer)", "/mayorista", async () => {
    const before = await fetchPublic("/mayorista");
    assert(!before.body.includes("Envíos (4B3)"), "no debería estar todavía");
    await api("PUT", "/api/admin/pages/test-envios", {
      title: "Envíos (4B3)",
      body: "Página informativa sintética de envíos -- Fase 4B.2.",
      placement: "ayuda",
      sortOrder: 0,
    });
    const after = await fetchPublic("/mayorista");
    assert(after.body.includes("Envíos (4B3)"), "el footer de una página sin relación no refleja el nuevo título");
    await api("PUT", "/api/admin/pages/test-envios", {
      title: "Envíos (prueba)",
      body: "Página informativa sintética de envíos -- Fase 4B.2.",
      placement: "ayuda",
      sortOrder: 0,
    });
    return "editar el título SÍ es global (aparece en el Footer de cualquier página)";
  });

  await scenario("Categoría: edición cosmética (selectiva)", "/categoria/test-basket", async () => {
    const unrelatedBefore = await fetchPublic("/mayorista");
    const get = await api("GET", "/api/admin/categories");
    const cat = get.body.find((c) => c.slug === "test-basket");
    await api("PUT", "/api/admin/categories/test-basket", { ...cat, description: "Descripción editada 4B3" });
    const after = await fetchPublic("/categoria/test-basket");
    assert(after.body.includes("Descripción editada 4B3"), "la categoría no refleja el cambio cosmético de inmediato");
    const unrelatedAfter = await fetchPublic("/mayorista");
    await api("PUT", "/api/admin/categories/test-basket", cat);
    return `edición cosmética: cache /mayorista antes=${unrelatedBefore.cache} después=${unrelatedAfter.cache}`;
  });

  await scenario("Categoría: edición estructural (nombre, global)", "/mayorista", async () => {
    const get = await api("GET", "/api/admin/categories");
    const cat = get.body.find((c) => c.slug === "test-basket");
    const before = await fetchPublic("/mayorista");
    assert(!before.body.includes("Básquet (4B3)"), "no debería estar todavía");
    await api("PUT", "/api/admin/categories/test-basket", { ...cat, name: "Básquet (4B3)" });
    const after = await fetchPublic("/mayorista");
    assert(after.body.includes("Básquet (4B3)"), "el nombre nuevo no aparece en el menú de una página sin relación");
    await api("PUT", "/api/admin/categories/test-basket", cat);
    return "cambiar el nombre SÍ es global (aparece en el menú de cualquier página)";
  });

  await scenario("Etiqueta (tag): cambio de color (global)", "/mayorista", async () => {
    const before = await fetchPublic("/");
    await api("PUT", "/api/admin/tags/Premier League", { color: "#ff00ff", isFilter: true });
    const after = await fetchPublic("/");
    assert(after.body.includes("#ff00ff") || after.body.includes("ff00ff"), "el color nuevo de la etiqueta no aparece de inmediato");
    await api("PUT", "/api/admin/tags/Premier League", { color: "#16a34a", isFilter: true });
    return "cambio de etiqueta es global, confirmado en home";
  });

  await scenario("Parche: cambio de precio (selectivo -- solo la ficha del producto que lo usa)", "/producto/test-camiseta-visible", async () => {
    const unrelatedBefore = await fetchPublic("/");
    const list = await api("GET", "/api/admin/patches");
    const patch = list.body.find((p) => p.id === "patch-test-mundial");
    await api("PUT", "/api/admin/patches/patch-test-mundial", { ...patch, price: 25000 });
    const after = await fetchPublic("/producto/test-camiseta-visible");
    assert(after.body.includes("25.000") || after.body.includes("25000"), "la ficha no refleja el nuevo precio del parche de inmediato");
    const unrelatedAfter = await fetchPublic("/");
    await api("PUT", "/api/admin/patches/patch-test-mundial", patch);
    return `selectivo: cache home antes=${unrelatedBefore.cache} después=${unrelatedAfter.cache} (no debería pasar a MISS)`;
  });

  await scenario("Settings: home (showBestSellers, selectiva a '/')", "/", async () => {
    const before = await fetchPublic("/");
    assert(before.body.includes("Más vendidos"), "debería mostrar 'Más vendidos' antes del cambio");
    const unrelatedBefore = await fetchPublic("/mayorista");
    await api("PUT", "/api/admin/settings/home", { showNewArrivals: false, showBestSellers: false, combos: { enabled: false, categorySlug: "" } });
    const after = await fetchPublic("/");
    assert(!after.body.includes("Más vendidos"), "la home sigue mostrando 'Más vendidos' tras desactivarlo");
    const unrelatedAfter = await fetchPublic("/mayorista");
    await api("PUT", "/api/admin/settings/home", { showNewArrivals: false, showBestSellers: true, combos: { enabled: false, categorySlug: "" } });
    return `selectiva a "/": cache /mayorista antes=${unrelatedBefore.cache} después=${unrelatedAfter.cache}`;
  });

  await scenario("Settings: galería de personalización (selectiva a /personalizacion)", "/personalizacion", async () => {
    const unrelatedBefore = await fetchPublic("/");
    await api("PUT", "/api/admin/settings/personalizationGallery", {
      posts: [{ id: "post-4b3", image: "https://ejemplo.test/post.jpg", caption: "Trabajo 4B3" }],
    });
    const after = await fetchPublic("/personalizacion");
    assert(after.body.includes("Trabajo 4B3"), "la galería no refleja el post nuevo de inmediato");
    const unrelatedAfter = await fetchPublic("/");
    await api("PUT", "/api/admin/settings/personalizationGallery", { posts: [] });
    return `selectiva: cache home antes=${unrelatedBefore.cache} después=${unrelatedAfter.cache}`;
  });

  await scenario("Settings: saleStatusColors (admin-only, NO debería invalidar nada público)", "/", async () => {
    const before = await fetchPublic("/");
    const beforeProduct = await fetchPublic("/producto/test-camiseta-visible");
    await api("PUT", "/api/admin/settings/saleStatusColors", {
      payment: { pagado: "#111111", pendiente: "#222222", senado: "#333333" },
      delivery: { entregado: "#444444", pendiente: "#555555", preparando: "#666666", agendado: "#777777" },
    });
    const after = await fetchPublic("/");
    const afterProduct = await fetchPublic("/producto/test-camiseta-visible");
    assert(after.cache !== "MISS", `home se re-generó sin necesidad (cache=${after.cache})`);
    assert(afterProduct.cache !== "MISS", `la ficha se re-generó sin necesidad (cache=${afterProduct.cache})`);
    return `confirmado SIN invalidación: home cache=${before.cache}->${after.cache}, ficha cache=${beforeProduct.cache}->${afterProduct.cache}`;
  });

  // ── reporte ──────────────────────────────────────────────────────────
  console.log("\n== Resumen ==");
  const pass = results.filter((r) => r.pass).length;
  console.log(`${pass}/${results.length} escenarios OK`);
  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.log("\nFALLARON:");
    for (const f of failed) console.log(`- ${f.scenario}: ${f.notes}`);
    process.exitCode = 1;
  }
}

/** Reconstruye el ProductInput que espera PUT a partir de lo que devuelve
 * GET (el objeto Product completo) -- ver lib/data.ts ProductInput. */
function productToInput(product, overrides, newSlug) {
  const variantQuantities = {};
  for (const v of product.variants ?? []) variantQuantities[v.size] = v.stock;
  return {
    slug: newSlug ?? product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    compareAt: product.compareAt ?? null,
    costPrice: product.costPrice ?? null,
    wholesalePrice: product.wholesalePrice ?? null,
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
    suppliers: (product.suppliers ?? []).map((s) => ({ supplierId: s.supplierId, unitCost: s.unitCost })),
    supplierSizeStock: (product.supplierSizeStock ?? []).map((s) => ({
      supplierId: s.supplierId,
      size: s.size,
      quantity: s.quantity,
    })),
    ...overrides,
  };
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
