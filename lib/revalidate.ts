import "server-only";
import { revalidatePath } from "next/cache";
import { getAllCategories } from "@/lib/data";
import {
  computeRevalidationPaths,
  logRevalidationFailure,
  revalidateAfterWrite,
  type ProductListingRevalidation,
} from "./revalidate-core.ts";

export type { ProductListingRevalidation };
export { logRevalidationFailure, revalidateAfterWrite };

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
 * (la única parte que necesita leer de la base) y se aplica
 * revalidatePath() ruta por ruta. Cada llamada a revalidatePath() va en su
 * propio try/catch: si una ruta falla, no debe impedir que se invaliden
 * las demás del mismo lote.
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

  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (err) {
      logRevalidationFailure(`revalidatePath("${path}")`, err);
    }
  }
}

/** Atajo para el caso más común: un solo producto cambiado. */
export async function revalidateProduct(
  slug: string,
  categorySlugs: Array<string | null | undefined>,
): Promise<void> {
  return revalidateProductListings([{ slug, categorySlugs }]);
}
