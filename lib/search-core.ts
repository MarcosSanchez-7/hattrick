// Sin "server-only", sin next/server, sin imports con alias "@/" a
// propósito: reglas puras de validación/normalización/armado de URL
// compartidas entre el Route Handler (app/api/catalog/search/route.ts,
// servidor) y SearchOverlay.tsx (cliente) -- se pueden testear con Node
// nativo (ver lib/search-core.test.ts, `node --test`), mismo patrón que
// lib/cart-resolve.ts.

/** Tope sobre el término de búsqueda crudo -- ninguna búsqueda legítima
 * necesita más que esto; rechaza barato un intento de abuso con un query
 * gigante. */
export const MAX_SEARCH_QUERY_LENGTH = 100;

/** Resultados que devuelve el overlay (barra rápida) por defecto -- mismo
 * número que ya usaba SearchOverlay.tsx (`.slice(0, 6)`) antes de la Fase
 * 3C, para no cambiar la experiencia visual. */
export const DEFAULT_SEARCH_LIMIT = 6;

/** Tope duro de resultados por pedido, sin importar qué pida el cliente --
 * el catálogo completo (library de referencia, Fase 3C) tiene ~150
 * productos; nadie necesita más de esto en una sola respuesta. */
export const MAX_SEARCH_LIMIT = 24;

export type ParsedSearchParams =
  | { ok: true; query: string; limit: number }
  | { ok: false; error: "query_too_long" | "invalid_limit" };

/**
 * Valida y normaliza los parámetros `q`/`limit` de la URL -- separado del
 * Route Handler para poder testear las reglas sin depender de next/server.
 * `q` vacío es válido (ok:true, query:"") -- el endpoint lo interpreta como
 * "sugerencias" (novedades) en vez de una búsqueda, mismo comportamiento
 * que SearchOverlay.tsx mostraba antes con el campo vacío.
 */
export function parseSearchParams(
  rawQuery: string | null,
  rawLimit: string | null,
): ParsedSearchParams {
  const query = (rawQuery ?? "").trim();
  if (query.length > MAX_SEARCH_QUERY_LENGTH) {
    return { ok: false, error: "query_too_long" };
  }

  if (rawLimit == null || rawLimit === "") {
    return { ok: true, query, limit: DEFAULT_SEARCH_LIMIT };
  }
  const parsedLimit = Number(rawLimit);
  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
    return { ok: false, error: "invalid_limit" };
  }
  return { ok: true, query, limit: Math.min(parsedLimit, MAX_SEARCH_LIMIT) };
}

/** Ruta del Route Handler -- una sola fuente de verdad para no repetir el
 * literal en SearchOverlay.tsx y en las pruebas. */
export const SEARCH_ENDPOINT = "/api/catalog/search";

/**
 * Arma la URL de búsqueda -- normaliza el término (trim + minúsculas) ANTES
 * de meterlo en la URL para que "Real Madrid" y "real madrid" compartan la
 * misma cache key (tanto en la caché de borde del Route Handler como en la
 * caché local del cliente, ver SearchOverlay.tsx) en vez de tratarse como
 * búsquedas distintas -- el propio searchProducts() de lib/catalog.ts ya
 * compara en minúsculas, así que esto no cambia qué resultados vuelven,
 * solo evita fragmentar la caché por capitalización.
 */
export function buildSearchUrl(query: string, limit: number = DEFAULT_SEARCH_LIMIT): string {
  const normalized = query.trim().toLowerCase();
  const params = new URLSearchParams();
  if (normalized) params.set("q", normalized);
  if (limit !== DEFAULT_SEARCH_LIMIT) params.set("limit", String(limit));
  const qs = params.toString();
  return qs ? `${SEARCH_ENDPOINT}?${qs}` : SEARCH_ENDPOINT;
}

/** Misma normalización que buildSearchUrl, expuesta aparte para que el
 * cliente pueda usarla como clave de su propia caché en memoria (ver
 * SearchOverlay.tsx) sin tener que re-parsear la URL. */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}
