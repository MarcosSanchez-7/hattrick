// Sin "server-only" ni imports con alias "@/" a propósito: este módulo no
// toca Supabase ni next/cache, así que se puede correr con Node nativo
// (ver lib/revalidate-core.test.ts, `node --test`) sin depender de la
// resolución de paths de TypeScript/Next ni instalar nada. El import de
// catalog.ts usa extensión .ts explícita por la misma razón -- Node ESM
// (a diferencia del bundler de Next) exige la extensión en imports
// relativos.
import { categorySlugPath, type Category } from "./catalog.ts";

export type ProductListingRevalidation = {
  slug: string;
  /** Categoría(s) a invalidar para este producto -- típicamente solo la
   * actual, o [anterior, nueva] si cambió de categoría. Entradas null/
   * undefined se ignoran (producto sin categoría resuelta, o el intento de
   * lectura previo a un borrado falló). */
  categorySlugs: Array<string | null | undefined>;
};

/** Para un slug de categoría, las URLs de esa categoría Y de cada uno de
 * sus ancestros (raíz→hoja) -- byCategoryTree() en lib/catalog.ts agrega
 * los productos de las subcategorías en la página del padre, así que un
 * producto en "futbol/europa/premier-league" también aparece listado en
 * "/categoria/futbol" y "/categoria/futbol/europa" -- invalidar solo la
 * hoja dejaría esas dos páginas de padre desactualizadas. */
function categoryPagePaths(categories: Category[], categorySlug: string): string[] {
  const chain = categorySlugPath(categories, categorySlug);
  const paths: string[] = [];
  for (let i = 0; i < chain.length; i++) {
    paths.push(`/categoria/${chain.slice(0, i + 1).join("/")}`);
  }
  return paths;
}

/**
 * Pura: sin async, sin I/O -- `categories` lo resuelve el caller
 * (revalidateProductListings en lib/revalidate.ts) antes de llamar acá.
 * Calcula qué rutas públicas afecta un lote de productos cambiados en la
 * misma operación (ej. los varios artículos de una venta, o un producto
 * que cambió de slug/categoría -- pasar dos entradas, una por slug/
 * categoría vieja y otra por la nueva, cubre ese caso). Los listados
 * globales ("/", Novedades, Ofertas) aparecen una sola vez para todo el
 * lote, no una vez por producto. Deduplica rutas de producto y de
 * categoría repetidas dentro del mismo lote.
 */
export function computeRevalidationPaths(
  products: ProductListingRevalidation[],
  categories: Category[],
): string[] {
  if (products.length === 0) return [];

  const paths: string[] = ["/", "/novedades", "/ofertas"];
  const seenProductSlugs = new Set<string>();
  const seenCategoryPaths = new Set<string>();

  for (const { slug, categorySlugs } of products) {
    if (!seenProductSlugs.has(slug)) {
      seenProductSlugs.add(slug);
      paths.push(`/producto/${slug}`);
    }
    for (const categorySlug of categorySlugs) {
      if (!categorySlug) continue;
      // Categoría inexistente (dato huérfano, o una que ya no existe) --
      // categorySlugPath() devuelve [] para un slug desconocido, así que
      // esto simplemente no agrega ninguna ruta extra, sin romper nada.
      for (const path of categoryPagePaths(categories, categorySlug)) {
        if (seenCategoryPaths.has(path)) continue;
        seenCategoryPaths.add(path);
        paths.push(path);
      }
    }
  }

  return paths;
}

/** Log uniforme para fallas de invalidación -- nunca incluye el body de la
 * request ni ningún dato sensible, solo contexto de diagnóstico (qué
 * operación, qué id/slug) y el mensaje del error. */
export function logRevalidationFailure(context: string, err: unknown): void {
  console.error(`[revalidate] ${context}:`, err instanceof Error ? err.message : err);
}

/**
 * Corre `invalidate` después de que la escritura que la motivó ya se
 * resolvió con éxito -- si `invalidate` (o cualquier consulta auxiliar que
 * haga adentro para calcular qué invalidar) tira, se loguea y se ignora en
 * vez de propagarse. Evita que un fallo de caché se confunda con un fallo
 * de la escritura real (que ya terminó, no hay nada que "deshacer" ni
 * reintentar): el handler que llama a esto siempre debe devolver la
 * respuesta de éxito de la escritura, nunca la de este catch.
 */
export async function revalidateAfterWrite(
  context: string,
  invalidate: () => Promise<void>,
): Promise<void> {
  try {
    await invalidate();
  } catch (err) {
    logRevalidationFailure(context, err);
  }
}
