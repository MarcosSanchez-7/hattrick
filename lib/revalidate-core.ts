// Sin "server-only" ni imports con alias "@/" a propósito: este módulo no
// toca Supabase ni next/cache, así que se puede correr con Node nativo
// (ver lib/revalidate-core.test.ts, `node --test`) sin depender de la
// resolución de paths de TypeScript/Next ni instalar nada. El import de
// catalog.ts usa extensión .ts explícita por la misma razón -- Node ESM
// (a diferencia del bundler de Next) exige la extensión en imports
// relativos.
import { categorySlugPath, type Category, type Page } from "./catalog.ts";

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
 * hoja dejaría esas dos páginas de padre desactualizadas. Exportada (antes
 * privada): la Fase 2 la reutiliza directamente en
 * app/api/admin/categories/[slug]/route.ts para el caso de edición
 * puramente cosmética (sin tocar nombre/slug/padre/visibilidad), que no
 * necesita la invalidación global del resto de operaciones sobre
 * categorías -- ver lib/revalidate.ts. */
export function categoryPagePaths(categories: Category[], categorySlug: string): string[] {
  const chain = categorySlugPath(categories, categorySlug);
  const paths: string[] = [];
  for (let i = 0; i < chain.length; i++) {
    paths.push(`/categoria/${chain.slice(0, i + 1).join("/")}`);
  }
  return paths;
}

/**
 * Solo las fichas de producto dadas -- sin "/", Novedades, Ofertas ni
 * categoría. Para cambios que únicamente afectan el contenido propio de la
 * ficha y no aparecen en ningún listado/grilla (ej. editar o borrar un
 * parche: ProductDetail.tsx lo muestra en el selector de personalización
 * de esa ficha puntual, pero ni ProductCard ni ninguna grilla leen datos
 * de parches -- usar computeRevalidationPaths ahí invalidaría home/
 * novedades/ofertas/categoría sin necesidad, ver app/api/admin/patches/**).
 * Deduplica slugs repetidos.
 */
export function computeProductOnlyPaths(slugs: string[]): string[] {
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    paths.push(`/producto/${slug}`);
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

/**
 * ¿Cambió algo de una categoría que Navbar/Footer/la URL de sus
 * descendientes necesitan reflejar? El slug es inmutable (ver
 * updateCategory en lib/data.ts), así que no entra en esta comparación --
 * solo lo que SÍ puede cambiar en una edición y tiene alcance más allá de
 * la propia página de la categoría: `name` (texto del link en el menú),
 * `parentSlug` (reubica la categoría -- cambia su URL y la de todos sus
 * descendientes) e `isVisible` (aparece/desaparece de todos lados). Si
 * ninguno cambió, la edición es puramente cosmética (tagline/descripción/
 * imagen/avisos/texto de envío) y alcanza con invalidar la propia página
 * (ver categoryPagePaths / revalidateCategoryOwnPages en lib/revalidate.ts).
 * Sin categoría anterior (no se pudo leer antes de escribir) se asume que
 * sí cambió algo, para no subestimar el alcance.
 */
export function categoryHasStructuralChange(
  oldCategory: Pick<Category, "name" | "parentSlug" | "isVisible"> | undefined,
  newCategory: Pick<Category, "name" | "parentSlug" | "isVisible">,
): boolean {
  return (
    !oldCategory ||
    oldCategory.name !== newCategory.name ||
    oldCategory.parentSlug !== newCategory.parentSlug ||
    oldCategory.isVisible !== newCategory.isVisible
  );
}

/**
 * ¿Cambió algo de una página informativa que el Footer necesita reflejar?
 * El slug es inmutable para páginas también (ver updatePage en
 * lib/data.ts: "no se permite cambiarlo"). Footer.tsx agrupa los links por
 * `placement`, muestra `title` como texto, y los ordena por `sortOrder` --
 * si ninguno de los tres cambió, la edición es de solo `body` (el caso más
 * común: corregir texto) y alcanza con la propia página.
 */
export function pageAffectsFooter(
  oldPage: Pick<Page, "title" | "placement" | "sortOrder"> | undefined,
  newPage: Pick<Page, "title" | "placement" | "sortOrder">,
): boolean {
  return (
    !oldPage ||
    oldPage.title !== newPage.title ||
    oldPage.placement !== newPage.placement ||
    oldPage.sortOrder !== newPage.sortOrder
  );
}

export type SettingsRevalidationRule =
  | { global: true }
  | { global?: false; paths: string[]; allProductPages?: boolean };

/** Traduce una regla de invalidación de un ajuste (ver SETTINGS_REVALIDATION
 * en app/api/admin/settings/[key]/route.ts) a la lista de entradas que
 * safeRevalidatePaths() espera -- separado para poder testear la
 * traducción sin depender de next/cache. */
export function settingsRevalidationEntries(
  rule: SettingsRevalidationRule,
): Array<string | { path: string; type: "page" | "layout" }> {
  if (rule.global) return [{ path: "/", type: "layout" }];
  const entries: Array<string | { path: string; type: "page" | "layout" }> = [...rule.paths];
  if (rule.allProductPages) {
    entries.push({ path: "/(store)/producto/[slug]", type: "page" });
  }
  return entries;
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
