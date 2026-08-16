"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { ensureLeafletIcons } from "@/components/admin/leafletIcons";
import type { Customer } from "@/lib/data";

const DEFAULT_CENTER: [number, number] = [-25.2637, -57.5759];
const DEFAULT_ZOOM = 12;

type LocatedCustomer = Customer & { latitude: number; longitude: number };

export default function CustomersMapView({ customers }: { customers: Customer[] }) {
  useEffect(() => {
    ensureLeafletIcons();
  }, []);

  const located = customers.filter(
    (c): c is LocatedCustomer => c.latitude != null && c.longitude != null,
  );

  const center: [number, number] =
    located.length > 0 ? [located[0].latitude, located[0].longitude] : DEFAULT_CENTER;

  return (
    <div style={{ height: 560, width: "100%" }}>
      <MapContainer center={center} zoom={DEFAULT_ZOOM} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((c) => {
          const place = [c.city, c.neighborhood].filter(Boolean).join(" - ");
          return (
            <Marker key={c.id} position={[c.latitude, c.longitude]}>
              <Popup>
                <strong>{c.name}</strong>
                {place ? (
                  <>
                    <br />
                    {place}
                  </>
                ) : null}
                {c.phone ? (
                  <>
                    <br />
                    {c.phone}
                  </>
                ) : null}
                <br />
                <Link href={`/gestion-ssjblue/clientes/${c.id}`}>Ver ficha</Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
