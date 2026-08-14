/**
 * URL pública base del sitio, usada para metadataBase, canonical, sitemap y
 * JSON-LD. Se toma de una env var porque el dominio todavía puede cambiar
 * (dominio propio pendiente) — cambiar un solo valor actualiza todo lo que
 * depende de una URL absoluta.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hattrick-nine.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "HATTRICK";

/**
 * Arma un BreadcrumbList de schema.org a partir de la misma lista de
 * migas que ya se usa para el breadcrumb visual — nunca se recalcula la
 * ruta dos veces, solo se reempaqueta para JSON-LD. `url` es opcional en
 * el último ítem (la página actual no necesita apuntar a otro lado).
 */
export function buildBreadcrumbJsonLd(items: { name: string; url?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}
