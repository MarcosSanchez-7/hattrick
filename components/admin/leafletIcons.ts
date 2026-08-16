import L from "leaflet";

/**
 * Los íconos por defecto de Leaflet se rompen con bundlers (Webpack/Turbopack
 * no resuelven las rutas relativas que Leaflet arma internamente) — se
 * apunta a las imágenes servidas desde unpkg en vez de intentar importarlas
 * como asset local. Solo se llama desde componentes ya cargados con
 * `next/dynamic({ ssr: false })`, nunca en el servidor.
 */
let ready = false;

export function ensureLeafletIcons() {
  if (ready) return;
  ready = true;
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}
