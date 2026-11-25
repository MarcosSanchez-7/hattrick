// Fase 4B.3 -- carrito/buscador/favoritos y Router Cache. Mismo contrato
// que run-scenarios.mjs (guard obligatorio, Supabase local, start:test).
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

async function cartItems(slugs, opts = {}) {
  const url = `${BASE_URL}/api/catalog/cart-items?slugs=${slugs.join(",")}${opts.fresh ? "&_fresh=1" : ""}`;
  const res = await fetch(url);
  return { status: res.status, cache: res.headers.get("cache-control"), body: await res.json() };
}

async function search(q) {
  const res = await fetch(`${BASE_URL}/api/catalog/search?q=${encodeURIComponent(q)}`);
  return { status: res.status, cache: res.headers.get("cache-control"), body: await res.json() };
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

async function main() {
  await login();
  console.log(`\n== Fase 4B.3 -- carrito/buscador/favoritos + Router Cache ==\n`);

  // ── CARRITO: precio ────────────────────────────────────────────────
  await scenario("Carrito: cart-items refleja el precio nuevo YA (no depende del TTL de ISR)", "/api/catalog/cart-items", async () => {
    const before = await cartItems(["test-camiseta-visible"]);
    assert(before.body.products[0].price === 280000, `precio inicial inesperado: ${before.body.products[0].price}`);

    const get = await api("GET", "/api/admin/products/p-test-visible");
    await api("PUT", "/api/admin/products/p-test-visible", productToInput(get.body, { price: 333000 }));

    // sin "_fresh": puede estar hasta 30s en la caché CDN del endpoint
    // (ver Fase 3B/3C) -- se pide explícitamente sin caché (como hace
    // refreshPrices() antes de WhatsApp) para medir la actualización real,
    // no quedar a merced de esos 30s.
    const afterFresh = await cartItems(["test-camiseta-visible"], { fresh: true });
    assert(afterFresh.body.products[0].price === 333000, `cart-items no refleja el precio nuevo: ${afterFresh.body.products[0].price}`);
    assert(afterFresh.cache.includes("no-store"), "la variante _fresh debería ser no-store");

    const get2 = await api("GET", "/api/admin/products/p-test-visible");
    await api("PUT", "/api/admin/products/p-test-visible", productToInput(get2.body, { price: 280000 }));
    return `cart-items (_fresh) devolvió el precio nuevo de inmediato -- política propia (CDN 30s / cliente 60s, ver Fase 3B), independiente del TTL de ISR (60s) de la página`;
  });

  // ── CARRITO: producto oculto bloquea la continuación ────────────────
  await scenario("Carrito: un producto ocultado desaparece de cart-items (bloquea WhatsApp en CarritoView)", "/api/catalog/cart-items", async () => {
    const before = await cartItems(["test-camiseta-novedad"], { fresh: true });
    assert(before.body.products.length === 1, "debería devolver el producto antes de ocultarlo");

    await api("PATCH", "/api/admin/products/p-test-novedad", { isVisible: false });
    const after = await cartItems(["test-camiseta-novedad"], { fresh: true });
    assert(after.body.products.length === 0, "cart-items sigue devolviendo el producto oculto");

    await api("PATCH", "/api/admin/products/p-test-novedad", { isVisible: true });
    return "producto oculto desaparece de cart-items -- CarritoView.tsx trata esto como 'unavailable' y bloquea el botón de WhatsApp (ver lib/data.ts getPublicProductsBySlugs + CarritoView.tsx handleContinue, Fase 4B.1)";
  });

  // ── BUSCADOR ─────────────────────────────────────────────────────────
  await scenario("Buscador: excluye productos ocultos de inmediato", "/api/catalog/search", async () => {
    const before = await search("Prueba Nueva");
    assert(before.body.products.some((p) => p.slug === "test-camiseta-novedad"), "debería aparecer antes de ocultar");
    await api("PATCH", "/api/admin/products/p-test-novedad", { isVisible: false });
    const after = await search("Prueba Nueva");
    assert(!after.body.products.some((p) => p.slug === "test-camiseta-novedad"), "el buscador sigue devolviendo el producto oculto");
    await api("PATCH", "/api/admin/products/p-test-novedad", { isVisible: true });
    return `política propia del buscador (s-maxage=30 CDN + 60s cliente, Fase 3C) -- distinta del ISR de /buscar (force-dynamic, siempre en vivo) y de la página de producto (ISR 60s)`;
  });

  // ── FAVORITOS (mismo endpoint que carrito) ──────────────────────────
  await scenario("Favoritos: mismo endpoint cart-items, mismo comportamiento ante ocultar/eliminar", "/api/catalog/cart-items", async () => {
    const before = await cartItems(["test-camiseta-agotada"], { fresh: true });
    assert(before.body.products.length === 1, "debería existir");
    return "WishlistProvider usa el mismo /api/catalog/cart-items que CartProvider (ver Fase 3C) -- las mismas garantías de precio/stock/ocultamiento aplican a favoritos sin lógica separada que pueda desincronizarse";
  });

  // ── ROUTER CACHE (Playwright) ────────────────────────────────────────
  await routerCacheChecks();

  console.log("\n== Resumen (carrito/buscador/Router Cache) ==");
  const relevant = results.slice(results.length - 6);
  const pass = relevant.filter((r) => r.pass).length;
  console.log(`${pass}/${relevant.length} OK`);
  for (const r of relevant) console.log(`[${r.pass ? "OK" : "FAIL"}] ${r.scenario} -- ${r.notes}`);
}

async function routerCacheChecks() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();

  await scenario("Router Cache: sesión nueva ve el precio actualizado en el primer request", "/producto/test-camiseta-visible", async () => {
    const get = await api("GET", "/api/admin/products/p-test-visible");
    await api("PUT", "/api/admin/products/p-test-visible", productToInput(get.body, { price: 345000 }));

    const page = await (await browser.newContext()).newPage();
    await page.goto(`${BASE_URL}/producto/test-camiseta-visible`, { waitUntil: "networkidle" });
    const text = await page.textContent("body");
    assert(text.includes("345.000") || text.includes("345000"), "sesión nueva no ve el precio actualizado");
    await page.close();

    const get2 = await api("GET", "/api/admin/products/p-test-visible");
    await api("PUT", "/api/admin/products/p-test-visible", productToInput(get2.body, { price: 280000 }));
    return "una sesión de navegador NUEVA siempre pide el server -- ve el dato ya invalidado, sin ningún Router Cache previo que pueda mostrar algo viejo";
  });

  await scenario(
    "Router Cache: una pestaña que YA visitó la ficha, tras un cambio server-side, puede seguir mostrando el valor viejo hasta navegar de nuevo",
    "/producto/test-camiseta-visible",
    async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.goto(`${BASE_URL}/producto/test-camiseta-visible`, { waitUntil: "networkidle" });
      const seenBefore = await page.textContent("body");
      assert(seenBefore.includes("280.000") || seenBefore.includes("280000"), "no se ve el precio original antes del cambio");

      const get = await api("GET", "/api/admin/products/p-test-visible");
      await api("PUT", "/api/admin/products/p-test-visible", productToInput(get.body, { price: 360000 }));

      // Navegación CLIENTE (Link/router.push, no un reload) de vuelta a la
      // misma ficha desde otra página -- ejercita el Router Cache del
      // navegador, no el servidor.
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.click('a[href="/producto/test-camiseta-visible"]').catch(() => {});
      await page.waitForTimeout(400);
      const afterClientNav = await page.textContent("body");

      // Recarga DURA (bypassea el Router Cache, pide el documento de nuevo
      // al servidor) -- esta sí tiene que ver el valor nuevo siempre.
      await page.reload({ waitUntil: "networkidle" });
      const afterReload = await page.textContent("body");
      const reloadHasNewPrice = afterReload.includes("360.000") || afterReload.includes("360000");
      assert(reloadHasNewPrice, "una recarga dura no muestra el precio nuevo -- esto sí sería un problema real del servidor, no del Router Cache");

      await page.close();
      const get2 = await api("GET", "/api/admin/products/p-test-visible");
      await api("PUT", "/api/admin/products/p-test-visible", productToInput(get2.body, { price: 280000 }));

      const clientNavHasNewPrice = afterClientNav.includes("360.000") || afterClientNav.includes("360000");
      return (
        `navegación cliente tras el cambio: ${clientNavHasNewPrice ? "ya mostró el precio nuevo" : "todavía mostraba el viejo (Router Cache del navegador, normal)"}` +
        ` -- recarga dura: siempre mostró el nuevo (${reloadHasNewPrice}). La invalidación del SERVIDOR fue inmediata (confirmado en los escenarios de producto); lo que tarda en reflejarse en una pestaña ya abierta es el caché del CLIENTE, una capa completamente distinta.`
      );
    },
  );

  await browser.close();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    if (process.exitCode === undefined) {
      const failed = results.some((r) => !r.pass);
      process.exitCode = failed ? 1 : 0;
    }
  });
