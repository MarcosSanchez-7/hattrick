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
