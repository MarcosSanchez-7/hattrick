import "server-only";
import { del } from "@vercel/blob";
import { OWN_BLOB_HOST, imageVariant } from "@/lib/image";

/**
 * Borra una imagen y sus variantes derivadas (-card/-thumb/-detail, ver
 * lib/image.ts) del Blob store. Se llama cuando una imagen deja de estar
 * referenciada (se reemplaza, se saca de la galería, o se borra el
 * producto/parche/categoría dueño) -- sin esto el blob queda huérfano para
 * siempre, ocupando espacio sin que nada lo use.
 *
 * Nunca tira: un borrado de blob que falla (ya no existe, blip de red) no
 * debe voltear la operación de base de datos que ya se hizo con éxito.
 */
export async function deleteImagesWithVariants(urls: string[]): Promise<void> {
  const ownUrls = urls.filter((u) => OWN_BLOB_HOST.test(u));
  if (ownUrls.length === 0) return;

  const all = ownUrls.flatMap((u) => [
    u,
    imageVariant(u, "card"),
    imageVariant(u, "thumb"),
    imageVariant(u, "detail"),
  ]);

  try {
    await del(all);
  } catch (err) {
    console.error("No se pudieron borrar algunos blobs huérfanos:", err);
  }
}
