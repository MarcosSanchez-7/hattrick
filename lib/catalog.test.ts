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
import { newArrivals, searchProducts, type Product } from "./catalog.ts";

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
