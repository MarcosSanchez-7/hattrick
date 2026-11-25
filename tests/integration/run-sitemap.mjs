// Fase 5 -- pruebas de integración del sitemap optimizado, contra el
// servidor de producción aislado (build:test/start:test, puerto 3100).
// Mismo contrato que el resto de tests/integration: guard obligatorio
// (ver isr-invalidation.mjs), Supabase local, nunca next dev.
import { BASE_URL, login, api, now, results, record } from "./isr-invalidation.mjs";

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

async function fetchSitemap() {
  const res = await fetch(`${BASE_URL}/sitemap.xml`);
  return { status: res.status, cache: res.headers.get("x-nextjs-cache"), cacheControl: res.headers.get("cache-control"), body: await res.text() };
}

/** Pila de apertura/cierre de tags -- sin instalar ningún parser XML
 * nuevo (restricción de la fase: no introducir dependencias). Alcanza
 * para confirmar buena formación real, no es una validación de esquema
 * completa (no hace falta: MetadataRoute.Sitemap ya garantiza la forma de
 * cada entrada, esto solo confirma que el XML resultante sea válido como
 * documento). */
function assertWellFormedXml(xml) {
  assert(xml.startsWith("<?xml"), "no empieza con declaración XML");
  const tagRe = /<(\/?)([a-zA-Z0-9]+)[^>]*?(\/?)>/g;
  const stack = [];
  let m;
  while ((m = tagRe.exec(xml))) {
    const [, closing, name, selfClosing] = m;
    if (selfClosing) continue;
    if (closing) {
      const expected = stack.pop();
      assert(expected === name, `tag mal cerrado: esperaba </${expected}>, encontré </${name}>`);
    } else {
      stack.push(name);
    }
  }
  assert(stack.length === 0, `tags sin cerrar: ${stack.join(", ")}`);
}

async function main() {
  await login();
  console.log(`\n== Fase 5 -- pruebas del sitemap contra ${BASE_URL} ==\n`);

  await scenario("Sitemap: XML válido, URLs absolutas y únicas", "/sitemap.xml", async () => {
    const { status, body } = await fetchSitemap();
    assert(status === 200, `esperaba 200, llegó ${status}`);
    assertWellFormedXml(body);

    const urlBlocks = body.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    assert(urlBlocks.length > 0, "el sitemap no tiene ninguna entrada");

    const locs = [...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    assert(locs.length === urlBlocks.length, "alguna entrada <url> no tiene <loc>");
    for (const loc of locs) assert(/^https?:\/\//.test(loc), `URL no absoluta: ${loc}`);
    assert(new Set(locs).size === locs.length, "hay URLs duplicadas en el sitemap");

    return `${urlBlocks.length} URLs, todas absolutas, sin duplicados, XML bien formado`;
  });

  await scenario("Sitemap: excluye productos y categorías ocultos, incluye los visibles", "/sitemap.xml", async () => {
    const { body } = await fetchSitemap();
    assert(body.includes("/producto/test-camiseta-visible"), "falta un producto visible");
    assert(!body.includes("/producto/test-camiseta-oculta"), "incluye un producto oculto");
    assert(!body.includes("/producto/test-camiseta-categoria-oculta"), "incluye un producto de categoría oculta");
    assert(body.includes("/categoria/test-basket"), "falta una categoría visible");
    assert(!body.includes("/categoria/test-categoria-oculta") && !body.includes("test-categoria-oculta"), "incluye la categoría oculta");
    return "productos/categorías ocultos ausentes; visibles presentes";
  });

  await scenario("Sitemap: no incluye rutas administrativas ni privadas", "/sitemap.xml", async () => {
    const { body } = await fetchSitemap();
    assert(!/gestion-ssjblue/i.test(body), "incluye rutas de /gestion-ssjblue");
    assert(!/\/api\//.test(body), "incluye rutas /api/");
    assert(!/\/carrito|\/favoritos|\/buscar/.test(body), "incluye rutas privadas de sesión (carrito/favoritos/buscador)");
    return "sin rutas administrativas ni privadas";
  });

  await scenario("Sitemap: conserva páginas informativas públicas", "/sitemap.xml", async () => {
    const { body } = await fetchSitemap();
    assert(body.includes("/pagina/test-envios"), "falta una página informativa de prueba");
    return "páginas informativas presentes";
  });

  await scenario("Sitemap: lastModified real en productos (updated_at), ausente en categorías/páginas (sin dato real)", "/sitemap.xml", async () => {
    const { body } = await fetchSitemap();
    const productBlock = body.match(/<url>\s*<loc>[^<]*\/producto\/test-camiseta-visible<\/loc>[\s\S]*?<\/url>/);
    assert(productBlock, "no se encontró el bloque <url> del producto de prueba");
    assert(/<lastmod>/.test(productBlock[0]), "el producto no tiene <lastmod>");
    const lastmod = productBlock[0].match(/<lastmod>([^<]*)<\/lastmod>/)[1];
    assert(!Number.isNaN(Date.parse(lastmod)), "lastmod no es una fecha válida");

    const categoryBlock = body.match(/<url>\s*<loc>[^<]*\/categoria\/test-basket<\/loc>[\s\S]*?<\/url>/);
    assert(categoryBlock, "no se encontró el bloque <url> de la categoría de prueba");
    assert(!/<lastmod>/.test(categoryBlock[0]), "la categoría tiene un <lastmod> inventado -- no hay columna real para eso en el esquema actual");

    return `producto: lastmod=${lastmod} (real, de products.updated_at) -- categoría: sin lastmod (correcto, sin dato real disponible)`;
  });

  await scenario("Sitemap: robots.txt referencia correctamente /sitemap.xml", "/robots.txt", async () => {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    const body = await res.text();
    assert(body.includes(`Sitemap: ${BASE_URL}/sitemap.xml`), "robots.txt no referencia el sitemap con la URL absoluta esperada");
    assert(/Disallow:\s*\/gestion-ssjblue/.test(body), "robots.txt no bloquea el panel admin");
    assert(/Disallow:\s*\/api\//.test(body), "robots.txt no bloquea /api/");
    return "robots.txt referencia el sitemap y bloquea rutas privadas";
  });

  await scenario("Sitemap: cacheado (HIT) -- una escritura administrativa real NO lo invalida (hallazgo documentado, no se corrige sin autorización)", "/sitemap.xml", async () => {
    const before = await fetchSitemap();
    assert(before.cache === "HIT", `se esperaba HIT antes de la prueba, llegó ${before.cache}`);
    const contentBefore = before.body;

    const create = await api("POST", "/api/admin/products", {
      slug: "test-producto-sitemap-scenario",
      name: "Producto Escenario Sitemap",
      category: "test-futbol",
      price: 90000,
      colors: { primary: "#000", secondary: "#111", accent: "#222" },
      pattern: "solid",
      description: "Creado para comprobar que el sitemap cacheado no se invalida on-demand.",
      stockMode: "ajeno",
    });
    assert(create.status === 201, `no se pudo crear el producto de prueba: ${JSON.stringify(create.body)}`);

    const after = await fetchSitemap();
    await api("DELETE", `/api/admin/products/${create.body.id}`);

    assert(after.cache === "HIT", `se esperaba que siguiera en HIT (nada invalida el sitemap hoy), llegó ${after.cache}`);
    assert(after.body === contentBefore, "el contenido cambió -- inesperado, no debería haber ninguna invalidación del sitemap todavía");
    assert(!after.body.includes("test-producto-sitemap-scenario"), "el producto nuevo apareció en el sitemap cacheado -- inesperado");

    return "confirmado: crear un producto NO invalida /sitemap.xml (sin invalidación bajo demanda hoy) -- solo el TTL de 3600s lo actualiza, o una build nueva";
  });

  console.log("\n== Resumen (sitemap, Fase 5) ==");
  const pass = results.filter((r) => r.pass).length;
  console.log(`${pass}/${results.length} OK`);
  for (const r of results) console.log(`[${r.pass ? "OK" : "FAIL"}] ${r.scenario} (${r.ms}ms) -- ${r.notes}`);
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
