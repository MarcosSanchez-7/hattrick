import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { OWN_BLOB_HOST, imageVariant, storagePath } from "@/lib/image";

const BUCKET = "product-images";

/**
 * Borra una imagen y sus variantes derivadas (-card/-thumb/-detail, ver
 * lib/image.ts) de Supabase Storage. Se llama cuando una imagen deja de
 * estar referenciada (se reemplaza, se saca de la galería, o se borra el
 * producto/parche/categoría dueño) -- sin esto el archivo queda huérfano
 * para siempre, ocupando espacio sin que nada lo use.
 *
 * Nunca tira: un borrado que falla (ya no existe, blip de red) no debe
 * voltear la operación de base de datos que ya se hizo con éxito.
 */
export async function deleteImagesWithVariants(urls: string[]): Promise<void> {
  const ownUrls = urls.filter((u) => OWN_BLOB_HOST.test(u));
  if (ownUrls.length === 0) return;

  const paths = ownUrls
    .flatMap((u) => [u, imageVariant(u, "card"), imageVariant(u, "thumb"), imageVariant(u, "detail")])
    .map(storagePath)
    .filter((p): p is string => p !== null);

  const { error } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
  if (error) {
    console.error("No se pudieron borrar algunos archivos huérfanos:", error.message);
  }
}
