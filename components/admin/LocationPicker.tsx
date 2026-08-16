"use client";

import dynamic from "next/dynamic";

export type LatLng = { lat: number; lng: number };

// Leaflet toca `window` al importarse — se carga solo en el cliente.
const LocationPickerMap = dynamic(() => import("@/components/admin/LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="location-picker__loading">Cargando mapa…</div>
  ),
});

export function LocationPicker({
  value,
  onChange,
  height = 260,
}: {
  value: LatLng | null;
  onChange: (v: LatLng | null) => void;
  height?: number;
}) {
  return (
    <div className="location-picker">
      <LocationPickerMap value={value} onChange={onChange} height={height} />
      <div className="location-picker__footer">
        <span className="meta">
          {value ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : "Sin ubicar — tocá el mapa para marcar"}
        </span>
        {value ? (
          <button
            type="button"
            className="link-underline meta"
            onClick={() => onChange(null)}
          >
            Quitar ubicación
          </button>
        ) : null}
      </div>
    </div>
  );
}
