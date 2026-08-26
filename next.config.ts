import type { NextConfig } from "next";

/**
 * Dominios externos realmente usados por el sitio (relevados leyendo el
 * código, no adivinados) — cualquier CSP más angosta rompería alguno de
 * estos:
 * - Vercel Blob: fotos de producto/categoría/parches/branding.
 * - OpenStreetMap (tile.*): tiles del mapa de clientes/ubicación de entrega.
 * - Nominatim: búsqueda de zona/barrio dentro del selector de ubicación.
 * - unpkg.com: íconos por defecto de Leaflet (ver components/admin/leafletIcons.ts).
 * - Google Fonts (googleapis/gstatic): tipografía Inter, importada en globals.css.
 * - img-src queda abierto a "https:" en general (no solo a Vercel Blob):
 *   ImageUploader.tsx permite pegar una URL externa a mano en vez de subir
 *   el archivo (ya usado en producción, ej. una imagen del Hero servida
 *   desde i.pinimg.com) — angostarlo a un listado fijo de dominios
 *   rompería cualquier imagen cargada así.
 * - Vercel Analytics (@vercel/analytics/next) sirve su script y manda sus
 *   eventos por /_vercel/insights/* en el propio dominio — no necesita
 *   entrada aparte, ya cubierto por 'self'.
 */
const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  // 'unsafe-eval' solo en dev: lo necesita el refresh/HMR de Next.js.
  `script-src 'self'${isDev ? " 'unsafe-eval'" : ""}`,
  // 'unsafe-inline' porque el sitio usa style={{...}} inline extensamente
  // (no hay forma simple de pasar a nonces sin tocar cientos de componentes).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://nominatim.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
