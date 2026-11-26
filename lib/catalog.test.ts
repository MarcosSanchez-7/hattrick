// Pruebas automatizadas de los selectores de búsqueda/novedades de
// lib/catalog.ts -- cero dependencias nuevas, mismo patrón que
// lib/cart-reducer.test.ts. No existían pruebas para este archivo antes de
// la Fase 3C: se agregan acá porque el nuevo endpoint de búsqueda
// (app/api/catalog/search/route.ts) reusa estas mismas funciones SIN
// modificarlas -- estas pruebas documentan y congelan el comportamiento
// exacto que el buscador ya tenía antes de independizar SearchOverlay,
// para poder afirmar con evidencia que la Fase 3C no degradó la calidad de
// los resultados (mismo algoritmo, llamado desde otro lugar).
// Corre con: node --test lib/catalog.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { newArrivals, relatedTo, searchProducts, type Product } from "./catalog.ts";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "camiseta-a",
    name: "Camiseta A",
    category: "futbol",
    price: 100000,
    isVisible: true,
    rating: 5,
    reviews: 0,
    stockMode: "propio",
    internalControl: false,
    sizes: ["M"],
    createdAt: "2026-01-01T00:00:00.000Z",
    colors: { primary: "#000", secondary: "#fff", accent: "#fff" },
    pattern: "solid",
    description: "",
    tags: [],
    ...overrides,
  };
}

test("searchProducts: query vacía devuelve lista vacía (sin 'match-all' accidental)", () => {
  const products = [product()];
  assert.deepEqual(searchProducts(products, ""), []);
  assert.deepEqual(searchProducts(products, "   "), []);
});

test("searchProducts: coincidencia parcial (substring) sobre el nombre", () => {
  const products = [product({ slug: "liverpool", name: "Liverpool FC 26/27" })];
  assert.equal(searchProducts(products, "liv").length, 1);
  assert.equal(searchProducts(products, "pool").length, 1);
  assert.equal(searchProducts(products, "verp").length, 1);
});

test("searchProducts: ignora mayúsculas/minúsculas en ambos lados", () => {
  const products = [product({ name: "Real Madrid" })];
  assert.equal(searchProducts(products, "REAL MADRID").length, 1);
  assert.equal(searchProducts(products, "real madrid").length, 1);
  assert.equal(searchProducts(products, "ReAl MaDrId").length, 1);
});

test("searchProducts: busca también por categoría", () => {
  const products = [product({ name: "Camiseta X", category: "sudamerica" })];
  assert.equal(searchProducts(products, "sudamerica").length, 1);
});

test("searchProducts: busca también por etiquetas (tags)", () => {
  const products = [product({ name: "Camiseta X", tags: ["Premier League", "Version Fan"] })];
  assert.equal(searchProducts(products, "premier").length, 1);
  assert.equal(searchProducts(products, "version fan").length, 1);
});

test("searchProducts: múltiples términos requieren TODOS presentes (AND, no OR)", () => {
  const products = [
    product({ id: "p1", slug: "a", name: "Real Madrid 26/27" }),
    product({ id: "p2", slug: "b", name: "Barcelona 26/27" }),
  ];
  const results = searchProducts(products, "real madrid");
  assert.equal(results.length, 1);
  assert.equal(results[0].slug, "a");
});

test("searchProducts: un término que no aparece en ningún campo excluye el producto aunque los demás sí matcheen", () => {
  const products = [product({ name: "Real Madrid 26/27" })];
  assert.equal(searchProducts(products, "real madrid inexistente").length, 0);
});

test("searchProducts: SIN normalización de acentos hoy (comportamiento existente, preservado tal cual) -- 'union' no encuentra 'Unión'", () => {
  // Documenta una limitación real y pre-existente del algoritmo (no
  // introducida por la Fase 3C): toLowerCase() no quita diacríticos. Esta
  // prueba existe para dejar constancia explícita de que la Fase 3C NO
  // intentó "arreglar" esto en silencio -- reusa el algoritmo byte a byte,
  // con sus limitaciones conocidas incluidas.
  const products = [product({ name: "Unión Europea" })];
  assert.equal(searchProducts(products, "union").length, 0);
  assert.equal(searchProducts(products, "unión").length, 1);
});

test("searchProducts: ordena los resultados por reviews descendente", () => {
  const products = [
    product({ id: "p1", slug: "a", name: "Camiseta Equipo", reviews: 3 }),
    product({ id: "p2", slug: "b", name: "Camiseta Equipo", reviews: 50 }),
    product({ id: "p3", slug: "c", name: "Camiseta Equipo", reviews: 12 }),
  ];
  const results = searchProducts(products, "camiseta equipo");
  assert.deepEqual(
    results.map((p) => p.slug),
    ["b", "c", "a"],
  );
});

test("searchProducts: no filtra por visibilidad -- es responsabilidad de quien arma el array de entrada", () => {
  const products = [product({ name: "Camiseta Oculta", isVisible: false })];
  // searchProducts no sabe nada de isVisible; si un producto oculto llega
  // hasta acá, lo encuentra igual -- la exclusión real pasa ANTES, en
  // getAllProducts()/getAllPublicProducts() (lib/data.ts), que nunca
  // devuelven productos ocultos salvo que se pida includeHidden:true.
  assert.equal(searchProducts(products, "oculta").length, 1);
});

test("newArrivals: solo productos con isNew=true", () => {
  const products = [
    product({ id: "p1", slug: "a", isNew: true }),
    product({ id: "p2", slug: "b", isNew: false }),
    product({ id: "p3", slug: "c" }), // isNew undefined -> falsy
  ];
  const results = newArrivals(products);
  assert.deepEqual(results.map((p) => p.slug), ["a"]);
});

test("newArrivals: ordena del más reciente al más viejo por createdAt", () => {
  const products = [
    product({ id: "p1", slug: "viejo", isNew: true, createdAt: "2025-01-01T00:00:00.000Z" }),
    product({ id: "p2", slug: "nuevo", isNew: true, createdAt: "2026-06-01T00:00:00.000Z" }),
    product({ id: "p3", slug: "medio", isNew: true, createdAt: "2026-01-01T00:00:00.000Z" }),
  ];
  const results = newArrivals(products);
  assert.deepEqual(
    results.map((p) => p.slug),
    ["nuevo", "medio", "viejo"],
  );
});

// ── relatedTo() -- Fase 7B.3-B ──────────────────────────────────────────
// relatedTo() dejó de tomar el catálogo completo para pasar a tomar una
// proyección liviana de candidatos (ver RelatedCandidate en lib/data.ts) +
// el producto completo actual, como DOS tipos independientes (P y Q, ver
// RelatedSelectable). Estas pruebas congelan el algoritmo exacto (no
// cambió) y, explícitamente, confirman que funciona igual con la
// proyección mínima que con el Product completo -- la equivalencia que
// justifica la nueva arquitectura.

/** Forma mínima que usa la nueva arquitectura (ver RelatedCandidate en
 * lib/data.ts) -- deliberadamente SIN price/images/sizes/soldOut/reviews,
 * para probar que relatedTo() selecciona igual sin esos campos. */
function candidate(overrides: {
  id: string;
  slug: string;
  category: string;
  tags?: string[];
  createdAt?: string;
}) {
  return {
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("relatedTo: misma categoría primero, excluye al propio producto, respeta el límite", () => {
  const current = product({ id: "p0", slug: "actual", category: "futbol" });
  const pool = [
    product({ id: "p1", slug: "a", category: "futbol" }),
    product({ id: "p0", slug: "actual", category: "futbol" }), // el propio producto, también en el pool
    product({ id: "p2", slug: "b", category: "futbol" }),
    product({ id: "p3", slug: "c", category: "futbol" }),
    product({ id: "p4", slug: "d", category: "futbol" }), // 5to de la categoría, sobra con limit=4
    product({ id: "p5", slug: "e", category: "basket" }),
  ];
  const result = relatedTo(pool, current, 4);
  assert.deepEqual(result.map((p) => p.slug), ["a", "b", "c", "d"]);
  assert.ok(!result.some((p) => p.slug === "actual"), "nunca incluye al propio producto");
});

test("relatedTo: con pocos candidatos de la misma categoría, completa con coincidencias de tags sin repetir", () => {
  const current = product({ id: "p0", slug: "actual", category: "futbol", tags: ["retro", "manga-larga"] });
  const pool = [
    product({ id: "p1", slug: "misma-cat", category: "futbol", tags: [] }),
    product({ id: "p2", slug: "por-tag-1", category: "basket", tags: ["retro"] }),
    product({ id: "p3", slug: "por-tag-2", category: "rugby", tags: ["manga-larga"] }),
    product({ id: "p4", slug: "sin-tag-ni-cat", category: "hockey", tags: ["otra-cosa"] }),
  ];
  const result = relatedTo(pool, current, 4);
  // 1 por categoría + 2 por tag = 3, sin el 4to (no comparte categoría ni tag)
  assert.deepEqual(result.map((p) => p.slug), ["misma-cat", "por-tag-1", "por-tag-2"]);
});

test("relatedTo: un candidato ya elegido por categoría no se repite si también matchea por tag", () => {
  const current = product({ id: "p0", slug: "actual", category: "futbol", tags: ["retro"] });
  const pool = [
    product({ id: "p1", slug: "misma-cat-y-tag", category: "futbol", tags: ["retro"] }),
  ];
  const result = relatedTo(pool, current, 4);
  assert.deepEqual(result.map((p) => p.slug), ["misma-cat-y-tag"]);
});

test("relatedTo: tags vacíos en el producto actual -- no intenta la rama de tags aunque falten candidatos", () => {
  const current = product({ id: "p0", slug: "actual", category: "futbol", tags: [] });
  const pool = [
    product({ id: "p1", slug: "misma-cat", category: "futbol", tags: [] }),
    product({ id: "p2", slug: "otra-cat-pero-con-tag-en-comun", category: "basket", tags: [] }),
  ];
  const result = relatedTo(pool, current, 4);
  assert.deepEqual(result.map((p) => p.slug), ["misma-cat"]);
});

test("relatedTo: menos candidatos que el límite -- devuelve solo los que hay, sin relleno artificial", () => {
  const current = product({ id: "p0", slug: "actual", category: "unica" });
  const pool = [product({ id: "p1", slug: "solo-uno", category: "unica" })];
  const result = relatedTo(pool, current, 4);
  assert.deepEqual(result.map((p) => p.slug), ["solo-uno"]);
});

test("relatedTo: sin categoría ni tags compartidos -- devuelve vacío, no tira", () => {
  const current = product({ id: "p0", slug: "actual", category: "unica", tags: [] });
  const pool = [product({ id: "p1", slug: "otra-cat", category: "otra", tags: ["x"] })];
  assert.deepEqual(relatedTo(pool, current, 4), []);
});

test("relatedTo: preserva el orden de entrada (created_at ASC ya aplicado por quien llama), incluso con fechas idénticas", () => {
  const current = product({ id: "p0", slug: "actual", category: "futbol" });
  // Mismo createdAt en los tres -- relatedTo() no define un criterio de
  // desempate propio; el orden resultante es el orden de `pool` tal cual
  // llega. Esto documenta una limitación preexistente (no determinista si
  // la consulta SQL que arma `pool` no diera un orden estable), no una
  // regresión de esta fase -- no se introduce ningún criterio nuevo.
  const tie = "2026-01-01T00:00:00.000Z";
  const pool = [
    product({ id: "p1", slug: "primero", category: "futbol", createdAt: tie }),
    product({ id: "p2", slug: "segundo", category: "futbol", createdAt: tie }),
    product({ id: "p3", slug: "tercero", category: "futbol", createdAt: tie }),
  ];
  assert.deepEqual(
    relatedTo(pool, current, 4).map((p) => p.slug),
    ["primero", "segundo", "tercero"],
  );
  // Si `pool` llega en otro orden (ej. la BD lo devolvió distinto), el
  // resultado cambia en consecuencia -- confirma que el orden depende
  // exclusivamente de la entrada, no de ningún campo propio del producto.
  const reversed = [...pool].reverse();
  assert.deepEqual(
    relatedTo(reversed, current, 4).map((p) => p.slug),
    ["tercero", "segundo", "primero"],
  );
});

test("relatedTo: los agotados pueden aparecer -- no filtra por stock/soldOut", () => {
  const current = product({ id: "p0", slug: "actual", category: "futbol" });
  const pool = [
    product({ id: "p1", slug: "agotado", category: "futbol", sizes: ["M"], soldOut: ["M"] }),
  ];
  assert.deepEqual(relatedTo(pool, current, 4).map((p) => p.slug), ["agotado"]);
});

test("relatedTo: equivalencia exacta usando la proyección liviana (RelatedCandidate) en vez del Product completo", () => {
  // El mismo escenario de categoría+tags que arriba, pero `products` es la
  // forma mínima que trae la nueva arquitectura (sin price/images/sizes/
  // soldOut/reviews) -- `product` (el actual) sigue siendo el Product
  // completo real, como en app/(store)/producto/[slug]/page.tsx. Esto es
  // la prueba de equivalencia que justifica reducir el contrato de tipos.
  const current = product({ id: "p0", slug: "actual", category: "futbol", tags: ["retro", "manga-larga"] });
  const candidates = [
    candidate({ id: "c1", slug: "misma-cat", category: "futbol", tags: [] }),
    candidate({ id: "c2", slug: "por-tag-1", category: "basket", tags: ["retro"] }),
    candidate({ id: "c3", slug: "por-tag-2", category: "rugby", tags: ["manga-larga"] }),
    candidate({ id: "c4", slug: "sin-match", category: "hockey", tags: ["otra-cosa"] }),
  ];
  const resultFromCandidates = relatedTo(candidates, current, 4);

  const asFullProducts = [
    product({ id: "c1", slug: "misma-cat", category: "futbol", tags: [] }),
    product({ id: "c2", slug: "por-tag-1", category: "basket", tags: ["retro"] }),
    product({ id: "c3", slug: "por-tag-2", category: "rugby", tags: ["manga-larga"] }),
    product({ id: "c4", slug: "sin-match", category: "hockey", tags: ["otra-cosa"] }),
  ];
  const resultFromFullCatalog = relatedTo(asFullProducts, current, 4);

  assert.deepEqual(
    resultFromCandidates.map((c) => c.slug),
    resultFromFullCatalog.map((p) => p.slug),
  );
  assert.deepEqual(resultFromCandidates.map((c) => c.slug), ["misma-cat", "por-tag-1", "por-tag-2"]);
});
