"use client";

import { useEffect, useState } from "react";
import type { LeafletEvent, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { ensureLeafletIcons } from "@/components/admin/leafletIcons";
import type { LatLng } from "@/components/admin/LocationPicker";

// Asunción, Paraguay — centro por defecto cuando no hay ubicación previa.
const DEFAULT_CENTER: [number, number] = [-25.2637, -57.5759];
const DEFAULT_ZOOM = 12;
const PIN_ZOOM = 15;

type ZoneResult = { display_name: string; lat: string; lon: string };

function ClickHandler({ onChange }: { onChange: (v: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Busca un lugar por nombre (Nominatim/OpenStreetMap) solo para mover la
 * vista del mapa — no marca el pin solo, el admin sigue tocando para eso. */
function ZoneSearch({ map }: { map: LeafletMap | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ZoneResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=py&accept-language=es&limit=5&q=${encodeURIComponent(q)}`,
        );
        const data = (await res.json()) as ZoneResult[];
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  const selectResult = (r: ZoneResult) => {
    map?.flyTo([Number(r.lat), Number(r.lon)], PIN_ZOOM);
    setQuery(r.display_name);
    setOpen(false);
  };

  return (
    <div className="location-picker__zone-search">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Buscar barrio o zona para ubicarte…"
        aria-label="Buscar zona en el mapa"
      />
      {open && (results.length > 0 || searching) ? (
        <ul className="location-picker__zone-results">
          {searching ? (
            <li className="meta">Buscando…</li>
          ) : (
            results.map((r, i) => (
              <li key={i}>
                <button type="button" onClick={() => selectResult(r)}>
                  {r.display_name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
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
  const [map, setMap] = useState<LeafletMap | null>(null);

  useEffect(() => {
    ensureLeafletIcons();
  }, []);

  // El contenedor cambia de tamaño (mapa expandible) sin que Leaflet se
  // entere solo — sin esto el mosaico de tiles queda cortado/desalineado.
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(timer);
  }, [height, map]);

  const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;

  return (
    <div>
      <ZoneSearch map={map} />
      <div style={{ height, width: "100%" }}>
        <MapContainer
          ref={setMap}
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
    </div>
  );
}
