"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ensureLeafletIcons } from "@/components/admin/leafletIcons";
import { formatPrice } from "@/lib/format";
import type { CustomerWithStats } from "@/lib/data";

const DEFAULT_CENTER: [number, number] = [-25.2637, -57.5759];
const DEFAULT_ZOOM = 12;

type LocatedCustomer = CustomerWithStats & { latitude: number; longitude: number };

/** Encuadra el mapa para que entren todos los pines visibles (según la
 * búsqueda), en vez de arrancar siempre fijo en Asunción. */
function FitBounds({ customers }: { customers: LocatedCustomer[] }) {
  const map = useMap();

  useEffect(() => {
    if (customers.length === 0) return;
    if (customers.length === 1) {
      map.setView([customers[0].latitude, customers[0].longitude], 15);
      return;
    }
    const bounds = customers.map((c) => [c.latitude, c.longitude] as [number, number]);
    map.fitBounds(bounds, { padding: [32, 32] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers.map((c) => c.id).join(",")]);

  return null;
}

export default function CustomersMapView({ customers }: { customers: CustomerWithStats[] }) {
  useEffect(() => {
    ensureLeafletIcons();
  }, []);

  const located = customers.filter(
    (c): c is LocatedCustomer => c.latitude != null && c.longitude != null,
  );

  return (
    <div style={{ height: 560, width: "100%" }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds customers={located} />
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
                {c.orderCount} pedido{c.orderCount !== 1 ? "s" : ""} · {formatPrice(c.totalSpent)}
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
