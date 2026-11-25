// Sin "server-only" ni imports con alias "@/" a propósito: esta fusión es
// pura (sin Supabase, sin next/cache) y se puede correr con Node nativo
// (ver lib/settings-merge.test.ts, `node --test`) sin instalar nada --
// mismo patrón que lib/shared-catalog-product.ts.

/** Resultado de leer (o no) una fila de site_settings -- `found: false`
 * cubre tanto "la clave no existe" como "hubo un error al consultar"
 * (ver fetchSettingRaw en lib/data.ts): en ambos casos getSetting() debe
 * usar el fallback, nunca romper la página. */
export type SettingFetchResult = { found: true; value: unknown } | { found: false };

/**
 * Fusión superficial (no profunda) entre el fallback de quien pregunta y
 * lo que se leyó de site_settings -- una clave presente en `value` pisa
 * la del fallback entera, no se mergean sub-objetos anidados. Separada de
 * Supabase/React.cache() a propósito para poder probarla sola: claves
 * inexistentes, valores JSON null, JSON complejo (arrays/objetos
 * anidados), y dos fallbacks DISTINTOS para la misma key (cada llamada
 * debe fusionar con SU PROPIO fallback, sin pisarse entre sí).
 */
export function mergeSettingValue<T>(fallback: T, result: SettingFetchResult): T {
  return result.found ? ({ ...fallback, ...(result.value as object) } as T) : fallback;
}
