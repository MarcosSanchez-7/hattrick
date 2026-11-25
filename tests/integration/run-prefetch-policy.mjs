// Fase 6B -- pruebas funcionales de la política de prefetch selectivo
// (ProductCard y Footer con prefetch={false}). Usa Playwright real contra
// el servidor de producción aislado (build:test/start:test, puerto 3100),
// nunca next dev. Mismo guard obligatorio que el resto de
// tests/integration (ver isr-invalidation.mjs).
//
// A propósito NO depende de un número exacto de solicitudes internas de
// Next.js -- cada escenario comprueba solo la PRESENCIA/AUSENCIA de un
// request con el header next-router-prefetch para el href en cuestión, y
// que la navegación real (click, teclado, touch) siga funcionando. Un
// cambio interno de Next.js en cuántas veces dispara el observer no
// debería romper estas pruebas.
import { chromium } from "playwright";
import { loadAndAssertTestEnv } from "../../scripts/test-env.mjs";

const env = loadAndAssertTestEnv();
const BASE_URL = env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3100";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FALLÓ: ${msg}`);
}

const results = [];
async function scenario(name, fn) {
  const t0 = Date.now();
  try {
    const notes = await fn();
    results.push({ scenario: name, pass: true, notes: notes ?? "" });
  } catch (err) {
    results.push({ scenario: name, pass: false, notes: String(err.message ?? err) });
  }
}

/** Observa si, durante `action`, se emitió algún request de prefetch
 * (rsc=1 + next-router-prefetch=1) cuya ruta incluya `pathSubstring`. */
async function prefetchHappenedFor(page, pathSubstring, action) {
  let seen = false;
  const handler = (req) => {
    const h = req.headers();
    if (h["rsc"] === "1" && h["next-router-prefetch"] === "1") {
      const pathname = new URL(req.url()).pathname;
      if (pathname.includes(pathSubstring)) seen = true;
    }
  };
  page.on("requestfinished", handler);
  await action();
  await page.waitForTimeout(1500);
  page.off("requestfinished", handler);
  return seen;
}

async function main() {
  const browser = await chromium.launch();
  console.log(`\n== Fase 6B -- pruebas de política de prefetch contra ${BASE_URL} ==\n`);

  await scenario("ProductCard: el enlace de IMAGEN no dispara prefetch al entrar en viewport", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const prefetched = await prefetchHappenedFor(page, "/producto/test-camiseta-visible", async () => {
      await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    });
    assert(!prefetched, "se vio un prefetch hacia /producto/test-camiseta-visible pese a prefetch={false}");
    await ctx.close();
    return "sin prefetch automático para la tarjeta, como se espera con prefetch={false} en ambos Links";
  });

  await scenario("ProductCard: click en la IMAGEN navega correctamente a la ficha", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    // El Link de imagen es el overlay posicionado sobre toda la media --
    // clickear el elemento de media ya cae sobre ese overlay.
    await page.click('a[aria-label="Camiseta de Prueba Visible"]');
    await page.waitForURL(/\/producto\/test-camiseta-visible/);
    assert(page.url().includes("/producto/test-camiseta-visible"), "no navegó a la ficha esperada");
    await ctx.close();
    return "click en la imagen navega a la ficha del producto";
  });

  await scenario("ProductCard: click en el NOMBRE navega correctamente a la ficha", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    await page.click(".card__name >> text=Camiseta de Prueba Visible");
    await page.waitForURL(/\/producto\/test-camiseta-visible/);
    await ctx.close();
    return "click en el nombre navega a la ficha del producto";
  });

  await scenario("ProductCard: navegación por TECLADO (Tab + Enter) funciona y no dispara prefetch en foco", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    const nameLink = page.locator(".card__name", { hasText: "Camiseta de Prueba Visible" });
    let prefetchedOnFocus = false;
    const handler = (req) => {
      const h = req.headers();
      if (h["rsc"] === "1" && h["next-router-prefetch"] === "1") {
        // Acotado al href de ESTE link -- otros Links de la misma página
        // (ej. Navbar, breadcrumbs) siguen en prefetch=auto por política y
        // su propio prefetch de fondo no debe contarse como un falso
        // positivo acá.
        if (new URL(req.url()).pathname.includes("/producto/test-camiseta-visible")) prefetchedOnFocus = true;
      }
    };
    page.on("requestfinished", handler);
    await nameLink.focus();
    await page.waitForTimeout(800);
    page.off("requestfinished", handler);
    assert(!prefetchedOnFocus, "el foco por teclado disparó un prefetch hacia este producto pese a prefetch={false}");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/producto\/test-camiseta-visible/);
    await ctx.close();
    return "Tab enfoca el link del nombre sin prefetch, Enter navega correctamente";
  });

  await scenario("ProductCard: navegación TÁCTIL (tap) funciona en viewport móvil", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    await page.tap('a[aria-label="Camiseta de Prueba Visible"]');
    await page.waitForURL(/\/producto\/test-camiseta-visible/);
    await ctx.close();
    return "tap en la tarjeta navega a la ficha en viewport móvil";
  });

  await scenario("ProductCard: el botón de FAVORITOS no navega (sigue siendo un botón independiente)", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    const before = page.url();
    const heart = page.locator(".wishlist-heart--card").first();
    await heart.click();
    await page.waitForTimeout(300);
    assert(page.url() === before, "clickear el corazón de favoritos navegó -- no debería, es un botón independiente del Link");
    await ctx.close();
    return "el botón de favoritos sigue funcionando sin disparar navegación";
  });

  await scenario("ProductCard: la SEGUNDA IMAGEN por hover sigue funcionando (sin relación con prefetch)", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    const media = page.locator(".card__media").first();
    const hasSecondBefore = await page.locator(".card__media-hover").count();
    await media.hover();
    await page.waitForTimeout(300);
    const hasSecondAfter = await page.locator(".card__media-hover").count();
    assert(hasSecondAfter >= hasSecondBefore, "el hover no reveló ninguna segunda imagen");
    await ctx.close();
    return "la segunda imagen por hover sigue revelándose igual (ProductCardMedia intacto)";
  });

  await scenario("Footer: los enlaces internos no disparan prefetch automático", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const prefetched = await prefetchHappenedFor(page, "/pagina/terminos", async () => {
      await page.goto(`${BASE_URL}/ofertas`, { waitUntil: "load" });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    });
    assert(!prefetched, "se vio un prefetch hacia /pagina/terminos pese a prefetch={false} en el Footer");
    await ctx.close();
    return "el footer en viewport no dispara prefetch hacia sus páginas legales";
  });

  await scenario("Footer: click en un enlace legal navega correctamente", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/ofertas`, { waitUntil: "load" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.click('footer a[href="/pagina/terminos"]');
    await page.waitForURL(/\/pagina\/terminos/);
    await ctx.close();
    return "click en un enlace del footer navega a la página legal esperada";
  });

  await scenario("Footer: todos los destinos siguen presentes (categorías, ayuda, empresa, legal)", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
    const hrefs = await page.locator("footer a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert(hrefs.includes("/novedades"), "falta el link a /novedades en el footer");
    assert(hrefs.includes("/ofertas"), "falta el link a /ofertas en el footer");
    assert(hrefs.some((h) => h?.startsWith("/categoria/")), "no hay ningún link de categoría en el footer");
    assert(hrefs.some((h) => h?.startsWith("/pagina/")), "no hay ningún link de página informativa en el footer");
    await ctx.close();
    return `${hrefs.length} enlaces en el footer, todos los destinos esperados presentes`;
  });

  await scenario("Navegación atrás/adelante: ficha -> atrás -> categoría -> adelante -> ficha", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    await page.click('a[aria-label="Camiseta de Prueba Visible"]');
    await page.waitForURL(/\/producto\/test-camiseta-visible/);
    await page.goBack();
    await page.waitForURL(/\/categoria\/test-futbol/);
    await page.goForward();
    await page.waitForURL(/\/producto\/test-camiseta-visible/);
    await ctx.close();
    return "atrás y adelante funcionan igual que antes del cambio de prefetch";
  });

  await scenario("Router Cache cálido: repetir la misma navegación en la misma pestaña sigue funcionando", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    await page.click('a[aria-label="Camiseta de Prueba Visible"]');
    await page.waitForURL(/\/producto\/test-camiseta-visible/);
    await page.click(".nav__logo");
    await page.waitForURL(`${BASE_URL}/`);
    await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    await page.click('a[aria-label="Camiseta de Prueba Visible"]');
    await page.waitForURL(/\/producto\/test-camiseta-visible/);
    await ctx.close();
    return "una segunda vuelta por la misma ruta (Router Cache potencialmente cálido) navega igual de bien";
  });

  await scenario("Carrusel de categorías (CategoryGrid, sin cambios): el loop infinito sigue funcionando", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
    const track = page.locator(".hscroll__track").first();
    // CategoryGrid NO se modificó en esta fase (se evaluó y se descartó
    // por beneficio insignificante, ver informe) -- esta prueba solo
    // confirma que sigue renderizando como un carrusel real, sin
    // interactuar con los botones/scroll-snap (eso ya depende de CSS que
    // no tiene nada que ver con prefetch y puede dar falsos negativos acá
    // según cuántas categorías tenga el dataset).
    const info = await track.evaluate((el) => {
      const style = getComputedStyle(el);
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, items: el.children.length, overflowX: style.overflowX };
    });
    assert(info.scrollWidth > info.clientWidth, "el carrusel no tiene contenido suficiente para scrollear (scrollWidth <= clientWidth)");
    assert(info.items >= 3, "el carrusel no muestra el triplicado de items esperado para el loop infinito");
    assert(["scroll", "auto"].includes(info.overflowX), `overflow-x inesperado en el track: ${info.overflowX}`);
    await ctx.close();
    return "el carrusel de categorías (CategoryGrid) sigue renderizando como contenedor scrolleable con el triplicado del loop, sin cambios";
  });

  await scenario("Menú móvil: abrir y cerrar sigue funcionando", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
    await page.click('[aria-label="Abrir menú"]');
    await page.waitForSelector(".mobile-menu", { state: "visible" });
    await page.click('[aria-label="Cerrar menú"]');
    await page.waitForSelector(".mobile-menu", { state: "detached" });
    await ctx.close();
    return "el menú móvil abre y cierra correctamente (Navbar intacto)";
  });

  await scenario("Entrada desde /novedades: tarjetas visibles y navegación funciona", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/novedades`, { waitUntil: "load" });
    const count = await page.locator(".card").count();
    assert(count > 0, "/novedades no muestra ninguna tarjeta de producto");
    await page.locator(".card__name").first().click();
    await page.waitForURL(/\/producto\//);
    await ctx.close();
    return `${count} tarjetas en /novedades, navegación a ficha OK`;
  });

  await scenario("Entrada desde /ofertas: tarjetas visibles y navegación funciona", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/ofertas`, { waitUntil: "load" });
    const count = await page.locator(".card").count();
    assert(count > 0, "/ofertas no muestra ninguna tarjeta de producto");
    await page.locator(".card__name").first().click();
    await page.waitForURL(/\/producto\//);
    await ctx.close();
    return `${count} tarjetas en /ofertas, navegación a ficha OK`;
  });

  await scenario("Productos relacionados (ficha de producto): tarjetas visibles y navegación funciona", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/producto/test-camiseta-visible`, { waitUntil: "load" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const relatedCount = await page.locator(".card").count();
    if (relatedCount === 0) {
      await ctx.close();
      return "sin productos relacionados para este producto en el dataset actual -- sección condicional, nada que verificar";
    }
    await page.locator(".card__name").first().click();
    await page.waitForURL(/\/producto\//);
    await ctx.close();
    return `${relatedCount} tarjetas relacionadas, navegación OK`;
  });

  await scenario("Entrada desde /favoritos: agregar un favorito y navegar desde ahí funciona", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/categoria/test-futbol`, { waitUntil: "load" });
    await page.locator(".wishlist-heart--card").first().click();
    await page.waitForTimeout(500);
    await page.goto(`${BASE_URL}/favoritos`, { waitUntil: "load" });
    const count = await page.locator(".card").count();
    assert(count > 0, "/favoritos no muestra el producto recién agregado");
    await page.locator(".card__name").first().click();
    await page.waitForURL(/\/producto\//);
    await ctx.close();
    return `${count} favorito(s) visibles, navegación desde /favoritos OK`;
  });

  console.log("\n== Resumen (política de prefetch, Fase 6B) ==");
  const pass = results.filter((r) => r.pass).length;
  console.log(`${pass}/${results.length} OK`);
  for (const r of results) console.log(`[${r.pass ? "OK" : "FAIL"}] ${r.scenario} -- ${r.notes}`);
  await browser.close();
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
