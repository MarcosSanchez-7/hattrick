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
 *
 * script-src necesita 'unsafe-inline': Next.js App Router hidrata la página
 * con sus propios <script> inline (self.__next_f.push(...), el streaming de
 * RSC) — sin 'unsafe-inline' el navegador los bloquea, React nunca hidrata,
 * y la página queda visualmente igual pero sin reaccionar a ningún click ni
 * tocar nada (así se detectó: el admin y el timer de ofertas dejaron de
 * responder apenas se agregó la CSP). La alternativa correcta es CSP por
 * nonce generado en proxy.ts en vez de next.config.ts (Next.js lo soporta
 * de forma nativa), pero requiere que proxy.ts cubra TODAS las rutas del
 * sitio, no solo /gestion-ssjblue y /api/admin como hoy — queda pendiente
 * como mejora, no bloqueante.
 *
 * connect-src necesita vercel.com Y el host de storage de Vercel Blob:
 * ImageUploader sube el archivo ORIGINAL directo desde el navegador a
 * Vercel Blob (@vercel/blob/client, ver components/admin/ImageUploader.tsx)
 * para no chocar con el límite de tamaño de las funciones serverless. El
 * PUT real de los bytes pasa por requestApi() -> getApiUrl(), que apunta a
 * "https://vercel.com/api/blob" por defecto (confirmado leyendo
 * node_modules/@vercel/blob/dist/chunk-*.js — no directo al host de
 * storage, esa suposición inicial estaba mal y dejó la subida rota una
 * primera vez). El host {storeId}.public.blob.vercel-storage.com se deja
 * igual por las dudas (además de servir las imágenes ya subidas, vía
 * img-src). Sin vercel.com en connect-src, la subida queda bloqueada por la
 * CSP y el uploader se queda "subiendo" para siempre sin mostrar error (el
 * fetch nunca sale, pero nada en el código distingue ese rechazo de una
 * subida lenta).
 */
const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  // 'unsafe-eval' solo en dev: lo necesita el refresh/HMR de Next.js.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // 'unsafe-inline' porque el sitio usa style={{...}} inline extensamente
  // (no hay forma simple de pasar a nonces sin tocar cientos de componentes).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://nominatim.openstreetmap.org https://*.public.blob.vercel-storage.com https://vercel.com",
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
