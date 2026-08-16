"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { CustomerWithStats } from "@/lib/data";

const CustomersMapView = dynamic(() => import("@/components/admin/CustomersMapView"), {
  ssr: false,
  loading: () => <div className="admin-empty">Cargando mapa…</div>,
});

function matches(customer: CustomerWithStats, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [customer.name, customer.phone, customer.city, customer.neighborhood]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function CustomersMap({ customers }: { customers: CustomerWithStats[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => customers.filter((c) => matches(c, query)),
    [customers, query],
  );

  return (
    <div>
      <div className="admin-card__head">
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          {filtered.length} de {customers.length} cliente
          {customers.length !== 1 ? "s" : ""} en el mapa
        </p>
        <input
          type="search"
          className="admin-search"
          placeholder="Buscar por nombre, teléfono, ciudad o barrio…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar clientes en el mapa"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">Ningún cliente coincide con la búsqueda.</div>
      ) : (
        <CustomersMapView customers={filtered} />
      )}
    </div>
  );
}
