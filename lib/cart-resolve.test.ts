// Pruebas automatizadas de lib/cart-resolve.ts usando el test runner nativo
// de Node (node:test / node:assert) -- cero dependencias nuevas, mismo
// patrón que lib/revalidate-core.test.ts y lib/shared-catalog-product.test.ts.
// Corre con: node --test lib/cart-resolve.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CART_ITEMS_ENDPOINT,
  MAX_CART_RESOLVE_SLUGS,
  MAX_SLUGS_QUERY_LENGTH,
  MAX_SLUG_LENGTH,
  acceptFreshSlugs,
  buildCartItemsUrl,
  chunkSlugs,
  isValidProductSlug,
  parseSlugsParam,
} from "./cart-resolve.ts";

test("isValidProductSlug acepta slugs con la forma real de slugify()", () => {
  assert.equal(isValidProductSlug("camiseta-river-plate-2026"), true);
  assert.equal(isValidProductSlug("a"), true);
  assert.equal(isValidProductSlug("a1-b2"), true);
});

test("isValidProductSlug rechaza vacío, mayúsculas, espacios y símbolos", () => {
  assert.equal(isValidProductSlug(""), false);
  assert.equal(isValidProductSlug("Camiseta-River"), false);
  assert.equal(isValidProductSlug("camiseta river"), false);
  assert.equal(isValidProductSlug("camiseta_river"), false);
  assert.equal(isValidProductSlug("-camiseta"), false);
  assert.equal(isValidProductSlug("camiseta-"), false);
  assert.equal(isValidProductSlug("camiseta--river"), false);
  assert.equal(isValidProductSlug("<script>"), false);
});

test("isValidProductSlug rechaza un slug más largo que MAX_SLUG_LENGTH", () => {
  const long = "a".repeat(MAX_SLUG_LENGTH + 1);
  assert.equal(isValidProductSlug(long), false);
  const exact = "a".repeat(MAX_SLUG_LENGTH);
  assert.equal(isValidProductSlug(exact), true);
});

test("parseSlugsParam separa, deduplica y conserva slugs válidos", () => {
  const result = parseSlugsParam("camiseta-a,camiseta-b,camiseta-a");
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.slugs, ["camiseta-a", "camiseta-b"]);
});

test("parseSlugsParam descarta en silencio slugs con forma inválida sin rechazar el resto", () => {
  const result = parseSlugsParam("camiseta-a,Camiseta Invalida,camiseta-b");
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.slugs, ["camiseta-a", "camiseta-b"]);
});

test("parseSlugsParam ignora espacios y entradas vacías entre comas", () => {
  const result = parseSlugsParam(" camiseta-a , , camiseta-b ,");
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.slugs, ["camiseta-a", "camiseta-b"]);
});

test("parseSlugsParam devuelve lista vacía (ok) para un parámetro vacío", () => {
  const result = parseSlugsParam("");
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.slugs, []);
});

test("parseSlugsParam rechaza todo el request si el crudo excede MAX_SLUGS_QUERY_LENGTH", () => {
  const raw = "a".repeat(MAX_SLUGS_QUERY_LENGTH + 1);
  const result = parseSlugsParam(raw);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "too_long");
});

test("parseSlugsParam rechaza todo el request si hay más candidatos que MAX_CART_RESOLVE_SLUGS", () => {
  const raw = Array.from({ length: MAX_CART_RESOLVE_SLUGS + 1 }, (_, i) => `slug-${i}`).join(",");
  const result = parseSlugsParam(raw);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "too_many");
});

test("parseSlugsParam acepta exactamente MAX_CART_RESOLVE_SLUGS candidatos", () => {
  const raw = Array.from({ length: MAX_CART_RESOLVE_SLUGS }, (_, i) => `slug-${i}`).join(",");
  const result = parseSlugsParam(raw);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.slugs.length, MAX_CART_RESOLVE_SLUGS);
});

test("buildCartItemsUrl arma la URL contra CART_ITEMS_ENDPOINT", () => {
  const url = buildCartItemsUrl(["camiseta-a"]);
  assert.equal(url.startsWith(`${CART_ITEMS_ENDPOINT}?slugs=`), true);
});

test("buildCartItemsUrl ordena y deduplica para que el mismo carrito arme siempre la misma URL", () => {
  const a = buildCartItemsUrl(["camiseta-b", "camiseta-a", "camiseta-b"]);
  const b = buildCartItemsUrl(["camiseta-a", "camiseta-b"]);
  assert.equal(a, b);
});

test("buildCartItemsUrl devuelve una URL válida (slugs codificados) para un solo slug", () => {
  const url = buildCartItemsUrl(["camiseta-a"]);
  assert.equal(url, `${CART_ITEMS_ENDPOINT}?slugs=camiseta-a`);
});

test("buildCartItemsUrl con lista vacía no revienta y produce un query vacío", () => {
  const url = buildCartItemsUrl([]);
  assert.equal(url, `${CART_ITEMS_ENDPOINT}?slugs=`);
});

test("MAX_SLUGS_QUERY_LENGTH alcanza para MAX_CART_RESOLVE_SLUGS slugs de MAX_SLUG_LENGTH caracteres", () => {
  const raw = Array.from({ length: MAX_CART_RESOLVE_SLUGS }, (_, i) =>
    "a".repeat(MAX_SLUG_LENGTH - String(i).length) + i,
  ).join(",");
  assert.ok(
    raw.length <= MAX_SLUGS_QUERY_LENGTH,
    `un carrito legítimo de ${MAX_CART_RESOLVE_SLUGS} slugs largos (${raw.length} chars) no debe rechazarse por "too_long" (límite ${MAX_SLUGS_QUERY_LENGTH})`,
  );
  const result = parseSlugsParam(raw);
  assert.equal(result.ok, true);
});

test("buildCartItemsUrl con bypassCache agrega un parámetro único por llamada", () => {
  const a = buildCartItemsUrl(["camiseta-a"], { bypassCache: true });
  const b = buildCartItemsUrl(["camiseta-a"], { bypassCache: true });
  assert.ok(a.includes("_fresh="));
  assert.ok(a.startsWith(`${CART_ITEMS_ENDPOINT}?slugs=camiseta-a&_fresh=`));
  // No afirmamos que a !== b (dos llamadas en el mismo milisegundo podrían
  // coincidir) -- lo que importa es que la URL ya no es la "cacheable" por
  // defecto.
  assert.notEqual(a, buildCartItemsUrl(["camiseta-a"]));
  void b;
});

test("buildCartItemsUrl sin bypassCache no agrega el parámetro de cache-busting", () => {
  const url = buildCartItemsUrl(["camiseta-a"]);
  assert.equal(url.includes("_fresh="), false);
});

test("chunkSlugs parte en lotes de a lo sumo el tamaño dado", () => {
  const slugs = Array.from({ length: 125 }, (_, i) => `slug-${i}`);
  const chunks = chunkSlugs(slugs, 50);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, 50);
  assert.equal(chunks[1].length, 50);
  assert.equal(chunks[2].length, 25);
  assert.deepEqual(chunks.flat(), slugs);
});

test("chunkSlugs con lista vacía devuelve cero lotes", () => {
  assert.deepEqual(chunkSlugs([]), []);
});

test("chunkSlugs con menos slugs que el tamaño del lote devuelve un solo lote", () => {
  const slugs = ["a", "b", "c"];
  assert.deepEqual(chunkSlugs(slugs, 50), [slugs]);
});

test("acceptFreshSlugs: un intento más viejo no debe perder slugs SIN relación con uno más nuevo", () => {
  // Reproduce el bug encontrado en el cierre de la Fase 3B: el producto A
  // se resuelve en un intento lento (seq=1); mientras tanto, un intento
  // totalmente distinto para el producto B (seq=2, sin relación con A)
  // ya se aplicó. Cuando el resultado lento de A llega, A no debe
  // descartarse solo porque *otro* slug ya avanzó la marca.
  const appliedSeqBySlug = new Map([["producto-b", 2]]);
  const accepted = acceptFreshSlugs(["producto-a"], 1, appliedSeqBySlug);
  assert.deepEqual(accepted, ["producto-a"]);
});

test("acceptFreshSlugs: descarta solo el slug puntual que un intento más nuevo ya reclamó", () => {
  const appliedSeqBySlug = new Map([["producto-a", 5]]);
  const accepted = acceptFreshSlugs(["producto-a", "producto-b"], 3, appliedSeqBySlug);
  assert.deepEqual(accepted, ["producto-b"]);
});

test("acceptFreshSlugs: con la misma marca (>=) todavía se acepta (idempotente, no es un '<' estricto)", () => {
  const appliedSeqBySlug = new Map([["producto-a", 4]]);
  const accepted = acceptFreshSlugs(["producto-a"], 4, appliedSeqBySlug);
  assert.deepEqual(accepted, ["producto-a"]);
});

test("acceptFreshSlugs: slug nunca antes reclamado (sin entrada en el mapa) siempre se acepta", () => {
  const accepted = acceptFreshSlugs(["producto-nuevo"], 1, new Map());
  assert.deepEqual(accepted, ["producto-nuevo"]);
});

test("acceptFreshSlugs: lista vacía no revienta", () => {
  assert.deepEqual(acceptFreshSlugs([], 1, new Map()), []);
});

test("chunkSlugs usa MAX_CART_RESOLVE_SLUGS como tamaño por defecto", () => {
  const slugs = Array.from({ length: MAX_CART_RESOLVE_SLUGS + 1 }, (_, i) => `slug-${i}`);
  const chunks = chunkSlugs(slugs);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].length, MAX_CART_RESOLVE_SLUGS);
  assert.equal(chunks[1].length, 1);
});
