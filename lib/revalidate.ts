import "server-only";
import { revalidatePath } from "next/cache";
import { getAllCategories } from "@/lib/data";
import {
  categoryHasStructuralChange,
  categoryPagePaths,
  computeProductOnlyPaths,
  computeRevalidationPaths,
  logRevalidationFailure,
  pageAffectsFooter,
  revalidateAfterWrite,
  settingsRevalidationEntries,
  type ProductListingRevalidation,
  type SettingsRevalidationRule,
} from "./revalidate-core.ts";

export type { ProductListingRevalidation, SettingsRevalidationRule };
export {
  categoryHasStructuralChange,
  categoryPagePaths,
  logRevalidationFailure,
  pageAffectsFooter,
  revalidateAfterWrite,
  settingsRevalidationEntries,
};

/** Una entrada literal ("/x") revalida esa página puntual; una entrada con
 * `type` revalida un patrón de ruta con segmento dinámico tal como Next lo
 * espera (ej. "/(store)/producto/[slug]", "page" invalida TODAS las
 * fichas de producto a la vez -- ver uso en app/api/admin/settings). Cada
 * ruta va en su propio try/catch: si una falla, no debe impedir que se
 * invaliden las demás del lote (misma garantía que ya tenía
 * revalidateProductListings, ahora factorizada acá para que la reutilicen
 * también categorías/páginas/settings sin duplicar el try/catch). */
export function safeRevalidatePaths(
  entries: Array<string | { path: string; type: "page" | "layout" }>,
): void {
  for (const entry of entries) {
    const path = typeof entry === "string" ? entry : entry.path;
    const type = typeof entry === "string" ? undefined : entry.type;
    try {
      revalidatePath(path, type);
    } catch (err) {
      logRevalidationFailure(`revalidatePath("${path}"${type ? `, "${type}"` : ""})`, err);
    }
  }
}

/**
 * Invalidación selectiva reutilizable para todo lo que depende del
 * catálogo público, usada por las rutas de productos/ventas/inventario del
 * admin (ver app/api/admin/products/**, sales/**, inventory/movements).
 *
 * Deliberadamente NO usa revalidatePath("/", "layout") -- la 3ra auditoría
 * de caché confirmó (con un comentario ya existente en sales/route.ts) que
 * esa llamada ya demostró ser lenta en producción al tocar las 80+ páginas
 * pre-renderizadas del sitio por cualquier escritura, por chica que sea.
 *
 * El cálculo de qué rutas tocar vive en lib/revalidate-core.ts (puro, sin
 * Supabase, testeable con Node nativo); acá solo se resuelve `categories`
 * (la única parte que necesita leer de la base).
 */
export async function revalidateProductListings(
  products: ProductListingRevalidation[],
): Promise<void> {
  if (products.length === 0) return;

  // includeHidden:true porque un producto puede pertenecer a una categoría
  // oculta (igual necesita poder resolver su cadena de ancestros para
  // invalidar bien) -- ya cacheada por request vía React.cache() en
  // lib/data.ts, así que esto no suma una consulta nueva si la ruta que
  // llama ya pidió categorías en el mismo request.
  const categories = await getAllCategories({ includeHidden: true });
  const paths = computeRevalidationPaths(products, categories);
  safeRevalidatePaths(paths);
}

/** Atajo para el caso más común: un solo producto cambiado. */
export async function revalidateProduct(
  slug: string,
  categorySlugs: Array<string | null | undefined>,
): Promise<void> {
  return revalidateProductListings([{ slug, categorySlugs }]);
}

/** Invalida solo las fichas de producto dadas, sin tocar "/"/Novedades/
 * Ofertas/categoría -- a diferencia de revalidateProductListings, que
 * SIEMPRE agrega esos tres listados globales (correcto para precio/stock/
 * visibilidad, que sí aparecen ahí, pero de más para algo que solo vive
 * dentro de la propia ficha). Ver computeProductOnlyPaths para el caso de
 * uso real (parches). */
export function revalidateProductPagesOnly(slugs: string[]): void {
  safeRevalidatePaths(computeProductOnlyPaths(slugs));
}

/** Páginas que una categoría puede afectar por sí sola (sin productos de
 * por medio) -- su propia cadena raíz→hoja, más "/" si es de primer nivel
 * (CategoryGrid en el home muestra imagen/tagline de las categorías raíz,
 * ver components/home/CategoryGrid.tsx). Usado para el único caso de
 * categoría que SÍ se pudo acotar en la Fase 2: una edición puramente
 * cosmética (tagline/descripción/imagen/avisos/texto de envío) que no
 * toca nombre, slug, categoría padre ni visibilidad -- esos cuatro campos
 * sí requieren la invalidación global (ver justificación en
 * app/api/admin/categories/[slug]/route.ts). */
export async function revalidateCategoryOwnPages(categorySlug: string): Promise<void> {
  const categories = await getAllCategories({ includeHidden: true });
  const category = categories.find((c) => c.slug === categorySlug);
  const paths = categoryPagePaths(categories, categorySlug);
  if (category && !category.parentSlug) paths.push("/");
  safeRevalidatePaths(paths);
}
