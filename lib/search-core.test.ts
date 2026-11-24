// Pruebas automatizadas de lib/search-core.ts usando el test runner nativo
// de Node (node:test / node:assert) -- cero dependencias nuevas, mismo
// patrón que lib/cart-resolve.test.ts.
// Corre con: node --test lib/search-core.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  MAX_SEARCH_QUERY_LENGTH,
  SEARCH_ENDPOINT,
  buildSearchUrl,
  normalizeSearchQuery,
  parseSearchParams,
} from "./search-core.ts";

test("parseSearchParams: query vacía es válida (interpretada como sugerencias)", () => {
  const result = parseSearchParams("", null);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.query, "");
    assert.equal(result.limit, DEFAULT_SEARCH_LIMIT);
  }
});

test("parseSearchParams: null/undefined se tratan como vacío", () => {
  const result = parseSearchParams(null, null);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.query, "");
});

test("parseSearchParams: recorta espacios alrededor de la query", () => {
  const result = parseSearchParams("   real madrid   ", null);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.query, "real madrid");
});

test("parseSearchParams: rechaza una query más larga que MAX_SEARCH_QUERY_LENGTH", () => {
  const result = parseSearchParams("a".repeat(MAX_SEARCH_QUERY_LENGTH + 1), null);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "query_too_long");
});

test("parseSearchParams: acepta exactamente MAX_SEARCH_QUERY_LENGTH caracteres", () => {
  const result = parseSearchParams("a".repeat(MAX_SEARCH_QUERY_LENGTH), null);
  assert.equal(result.ok, true);
});

test("parseSearchParams: sin limit explícito usa DEFAULT_SEARCH_LIMIT", () => {
  const result = parseSearchParams("messi", null);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.limit, DEFAULT_SEARCH_LIMIT);
});

test("parseSearchParams: respeta un limit válido dentro del tope", () => {
  const result = parseSearchParams("messi", "10");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.limit, 10);
});

test("parseSearchParams: cappea un limit por encima de MAX_SEARCH_LIMIT en vez de rechazarlo", () => {
  const result = parseSearchParams("messi", String(MAX_SEARCH_LIMIT + 50));
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.limit, MAX_SEARCH_LIMIT);
});

test("parseSearchParams: rechaza un limit no numérico", () => {
  const result = parseSearchParams("messi", "abc");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "invalid_limit");
});

test("parseSearchParams: rechaza un limit de cero o negativo", () => {
  assert.equal(parseSearchParams("messi", "0").ok, false);
  assert.equal(parseSearchParams("messi", "-5").ok, false);
});

test("parseSearchParams: rechaza un limit no entero (decimal)", () => {
  const result = parseSearchParams("messi", "3.5");
  assert.equal(result.ok, false);
});

test("buildSearchUrl: normaliza mayúsculas/espacios para que la cache key sea estable", () => {
  const a = buildSearchUrl("Real Madrid");
  const b = buildSearchUrl("  real madrid  ");
  const c = buildSearchUrl("REAL MADRID");
  assert.equal(a, b);
  assert.equal(b, c);
});

test("buildSearchUrl: query vacía apunta al endpoint sin parámetro q", () => {
  const url = buildSearchUrl("");
  assert.equal(url, SEARCH_ENDPOINT);
});

test("buildSearchUrl: incluye limit en la URL solo cuando difiere del default", () => {
  const withDefault = buildSearchUrl("messi", DEFAULT_SEARCH_LIMIT);
  const withCustom = buildSearchUrl("messi", 12);
  assert.equal(withDefault.includes("limit="), false);
  assert.equal(withCustom.includes("limit=12"), true);
});

test("normalizeSearchQuery: mismo criterio que buildSearchUrl", () => {
  assert.equal(normalizeSearchQuery("  Real Madrid  "), "real madrid");
});
