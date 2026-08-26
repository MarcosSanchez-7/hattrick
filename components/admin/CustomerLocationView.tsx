"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { ensureLeafletIcons } from "@/components/admin/leafletIcons";
import type { LatLng } from "@/components/admin/LocationPicker";

const ZOOM = 15;

/** Mapa de solo lectura: un pin fijo, sin click-to-mover ni zoom/drag — para
 * mostrar la ubicación guardada sin riesgo de moverla sin querer al mirarla. */
export default function CustomerLocationView({ value }: { value: LatLng }) {
  useEffect(() => {
    ensureLeafletIcons();
  }, []);

  return (
    <div style={{ height: 220, width: "100%" }}>
      <MapContainer
        center={[value.lat, value.lng]}
        zoom={ZOOM}
        style={{ height: "100%", width: "100%" }}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[value.lat, value.lng]} />
      </MapContainer>
    </div>
  );
}
