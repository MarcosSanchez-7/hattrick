"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { IconExpand, IconExternal } from "@/components/ui/Icons";

export type LatLng = { lat: number; lng: number };

// Leaflet toca `window` al importarse — se carga solo en el cliente.
const LocationPickerMap = dynamic(() => import("@/components/admin/LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="location-picker__loading">Cargando mapa…</div>
  ),
});

const EXPANDED_HEIGHT = 480;

export function LocationPicker({
  value,
  onChange,
  height = 260,
}: {
  value: LatLng | null;
  onChange: (v: LatLng | null) => void;
  height?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="location-picker">
      <LocationPickerMap
        value={value}
        onChange={onChange}
        height={expanded ? EXPANDED_HEIGHT : height}
      />
      <div className="location-picker__footer">
        <span className="meta">
          {value
            ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : "Sin ubicar — tocá el mapa para marcar"}
        </span>
        <div className="row gap-3">
          {value ? (
            <>
              <a
                href={`https://www.google.com/maps?q=${value.lat},${value.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline meta"
              >
                <span className="row gap-2" style={{ alignItems: "center" }}>
                  <IconExternal className="icon--sm" />
                  Abrir en Google Maps
                </span>
              </a>
              <button
                type="button"
                className="link-underline meta"
                onClick={() => onChange(null)}
              >
                Quitar ubicación
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="link-underline meta"
            onClick={() => setExpanded((e) => !e)}
          >
            <span className="row gap-2" style={{ alignItems: "center" }}>
              <IconExpand className="icon--sm" />
              {expanded ? "Achicar mapa" : "Expandir mapa"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
