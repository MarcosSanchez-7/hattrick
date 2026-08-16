"use client";

import { useEffect } from "react";
import type { LeafletEvent, Marker as LeafletMarker } from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { ensureLeafletIcons } from "@/components/admin/leafletIcons";
import type { LatLng } from "@/components/admin/LocationPicker";

// Asunción, Paraguay — centro por defecto cuando no hay ubicación previa.
const DEFAULT_CENTER: [number, number] = [-25.2637, -57.5759];
const DEFAULT_ZOOM = 12;
const PIN_ZOOM = 15;

function ClickHandler({ onChange }: { onChange: (v: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPickerMap({
  value,
  onChange,
  height,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  height: number;
}) {
  useEffect(() => {
    ensureLeafletIcons();
  }, []);

  const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;

  return (
    <div style={{ height, width: "100%" }}>
      <MapContainer
        center={center}
        zoom={value ? PIN_ZOOM : DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {value ? (
          <Marker
            position={[value.lat, value.lng]}
            draggable
            eventHandlers={{
              dragend: (e: LeafletEvent) => {
                const marker = e.target as LeafletMarker;
                const pos = marker.getLatLng();
                onChange({ lat: pos.lat, lng: pos.lng });
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
