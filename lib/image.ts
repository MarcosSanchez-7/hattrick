/**
 * Variantes de tamaño de imagen, derivadas por convención de nombre de
 * archivo — nunca se guardan como campo aparte en la base. El pipeline de
 * subida (app/api/admin/upload/optimize/route.ts) genera "-card"/"-thumb"
 * al lado del archivo original ("full") para cada imagen que sube; acá
 * solo se arma la URL correspondiente para pedir la variante correcta
 * según el contexto (grilla, miniatura, imagen grande).
 */

// Antes apuntaba a *.public.blob.vercel-storage.com (migración a Supabase
// Storage, bucket "product-images") -- el bucket queda fijo en el patrón
// para no reconocer como "propia" cualquier otra URL de *.supabase.co.
export const OWN_BLOB_HOST =
  /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/product-images\//i;

export type ImageSize = "thumb" | "card" | "detail" | "full";

/** URL pública completa -> path relativo al bucket "product-images" (lo
 * que pide el SDK de Supabase Storage para .remove()/.upload() -- a
 * diferencia de @vercel/blob, que trabajaba con la URL completa). null si
 * la URL no es nuestra (ver OWN_BLOB_HOST). */
export function storagePath(url: string): string | null {
  if (!OWN_BLOB_HOST.test(url)) return null;
  return url.replace(OWN_BLOB_HOST, "");
}

export function imageVariant(url: string, size: ImageSize): string {
  // "full" es el archivo tal cual se guardó siempre, sin cambios. URLs que
  // no son de nuestro propio Blob (ej. una pegada a mano en el Hero desde
  // i.pinimg.com) tampoco se tocan — no existe ningún archivo "-thumb"/"-card"
  // ahí, y armar esa URL rompería la imagen.
  if (size === "full" || !OWN_BLOB_HOST.test(url)) return url;

  const dot = url.lastIndexOf(".");
  if (dot === -1) return url;
  // Las variantes chicas siempre se suben como .webp (ver optimize/route.ts),
  // incluso para GIF (que guarda el "full" tal cual, sin recodificar) — por
  // eso acá se fuerza la extensión en vez de reusar la del archivo original.
  return `${url.slice(0, dot)}-${size}.webp`;
}
