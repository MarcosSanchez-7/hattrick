// Sin "server-only", sin next/server, sin imports con alias "@/" a
// propósito: reglas puras de validación/armado de URL compartidas entre el
// Route Handler (app/api/catalog/cart-items/route.ts, servidor) y
// CartProvider.tsx (cliente) -- se pueden testear con Node nativo (ver
// lib/cart-resolve.test.ts, `node --test`), mismo patrón que
// lib/revalidate-core.ts y lib/shared-catalog-product.ts.

/** Tope duro de slugs por resolución -- ver también lib/data.ts
 * (getPublicProductsBySlugs la reusa como segunda barrera del lado del
 * servidor, por si esa función se llama desde otro lugar que no sea este
 * Route Handler). Ningún carrito real necesita más que esto. */
export const MAX_CART_RESOLVE_SLUGS = 50;

/** Un slug real (slugify(), ver lib/slug.ts) nunca pasa de este largo. */
export const MAX_SLUG_LENGTH = 80;

/** Tope sobre el parámetro `slugs` CRUDO (antes de parsear nada) -- rechaza
 * barato un query gigante sin siquiera separar por comas.
 *
 * DERIVADO de MAX_CART_RESOLVE_SLUGS/MAX_SLUG_LENGTH a propósito, no un
 * número suelto: un valor fijo de 2000 (detectado en la verificación de la
 * Fase 3B) rechazaba de entrada un carrito perfectamente legítimo de 50
 * productos con slugs largos (50 × 80 + 49 comas = 4049 > 2000), antes
 * siquiera de llegar al chequeo de cantidad -- un cliente con muchos
 * productos de nombre largo recibía "consulta demasiado larga" en vez de
 * resolverse. Esta cuenta garantiza que el límite de longitud nunca sea
 * más estricto que el de cantidad. */
export const MAX_SLUGS_QUERY_LENGTH = MAX_CART_RESOLVE_SLUGS * (MAX_SLUG_LENGTH + 1);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidProductSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug);
}

export type ParsedSlugsResult =
  | { ok: true; slugs: string[] }
  | { ok: false; error: "too_long" | "too_many" };

/**
 * Parsea, deduplica y valida el parámetro `slugs` de la URL (lista separada
 * por comas) -- separado del Route Handler para poder testear las reglas
 * sin depender de next/server. Slugs inválidos (fuera de forma) se
 * descartan en silencio en vez de rechazar todo el request -- un dato
 * corrupto en localStorage no debería tumbar la resolución de los demás
 * slugs válidos del mismo carrito. `too_long`/`too_many` sí rechazan todo:
 * son señales de abuso, no de un dato puntual mal formado.
 */
export function parseSlugsParam(raw: string): ParsedSlugsResult {
  if (raw.length > MAX_SLUGS_QUERY_LENGTH) return { ok: false, error: "too_long" };

  const candidates = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (candidates.length > MAX_CART_RESOLVE_SLUGS) return { ok: false, error: "too_many" };

  const unique = Array.from(new Set(candidates));
  const slugs = unique.filter(isValidProductSlug);
  return { ok: true, slugs };
}

/** Ruta del Route Handler -- una sola fuente de verdad para no repetir el
 * literal en CartProvider.tsx y en las pruebas. */
export const CART_ITEMS_ENDPOINT = "/api/catalog/cart-items";

/**
 * Arma la URL de resolución para un lote de slugs -- ordena antes de unir
 * (además de deduplicar) para que el mismo conjunto de productos siempre
 * arme la MISMA URL sin importar en qué orden se agregaron al carrito; así
 * el Cache-Control del Route Handler (ver esa ruta) puede servir del borde
 * a dos carritos distintos con los mismos productos en otro orden, en vez
 * de tratarlos como peticiones distintas.
 */
export function buildCartItemsUrl(slugs: string[], opts?: { bypassCache?: boolean }): string {
  const unique = Array.from(new Set(slugs.filter(Boolean))).sort();
  const base = `${CART_ITEMS_ENDPOINT}?slugs=${encodeURIComponent(unique.join(","))}`;
  if (!opts?.bypassCache) return base;
  // Cache-busting real para la verificación de precio/stock previa a
  // WhatsApp (ver refreshPrices en CartProvider.tsx): `fetch(..., {cache:
  // "no-store"})` por sí solo SOLO le dice al navegador que no use (ni
  // guarde) SU PROPIA caché HTTP local -- no es una instrucción de red que
  // un proxy/CDN intermedio esté obligado a respetar, y el Route Handler
  // marca sus respuestas 200 como `s-maxage=30` para absorber ráfagas de
  // carritos repetidos (ver esa ruta). Sin esto, un CDN que no mire el
  // request en absoluto (solo cachee por URL) podría servir una respuesta
  // de hasta 30s de antigüedad aunque el navegador pida "no-store". Un
  // parámetro único por pedido cambia la URL -> cambia la cache key -> el
  // CDN nunca tiene una entrada previa para esa URL exacta, sin importar
  // qué política de caché respete.
  return `${base}&_fresh=${Date.now()}`;
}

/**
 * Parte una lista de slugs en lotes de a lo sumo MAX_CART_RESOLVE_SLUGS --
 * un carrito con más productos distintos que el tope del endpoint (ver esa
 * constante) no debe fallar la resolución COMPLETA por el 400 "demasiados
 * productos a la vez": cada lote se pide por separado y los resultados se
 * combinan (ver CartProvider.tsx).
 */
export function chunkSlugs(slugs: string[], size: number = MAX_CART_RESOLVE_SLUGS): string[][] {
  if (slugs.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < slugs.length; i += size) chunks.push(slugs.slice(i, i + size));
  return chunks;
}

/**
 * De una lista de slugs que acaba de resolver un intento de red (numerado
 * `attemptSeq`), devuelve solo los que ESE intento todavía puede reclamar
 * como más reciente -- comparando por slug contra `appliedSeqBySlug`, no
 * con un único número global para todo el carrito.
 *
 * Por qué por slug y no un solo "último intento ganador" compartido: dos
 * productos sin relación entre sí (A resolviéndose en un intento lento,
 * B en uno más nuevo y rápido) competirían por la misma marca aunque sus
 * slugs nunca se hubieran superpuesto -- el intento más viejo perdería
 * TODO su resultado, incluido el de A, que seguía siendo perfectamente
 * válido (detectado en el cierre de la Fase 3B). Acá cada slug compite
 * solo contra su propia marca.
 *
 * Usado tanto por la resolución de fondo como por refreshPrices() en
 * CartProvider.tsx -- `appliedSeqBySlug` se actualiza ahí mismo (es un
 * ref de React, no puede vivir en este módulo puro).
 */
export function acceptFreshSlugs(
  slugs: string[],
  attemptSeq: number,
  appliedSeqBySlug: ReadonlyMap<string, number>,
): string[] {
  return slugs.filter((slug) => attemptSeq >= (appliedSeqBySlug.get(slug) ?? 0));
}
