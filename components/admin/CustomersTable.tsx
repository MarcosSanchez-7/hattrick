"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CustomerWithStats } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { IconChevron, IconTrash } from "@/components/ui/Icons";

type SortBy = "" | "recent" | "name";

const dateFormatter = new Intl.DateTimeFormat("es-PY", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

export function CustomersTable({ customers }: { customers: CustomerWithStats[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("");
  // Solo tiene efecto visual en mobile (ver globals.css) — en desktop la
  // fila siempre muestra todos los datos, sin importar este estado.
  const [expandedMobile, setExpandedMobile] = useState<Set<string>>(new Set());

  const toggleMobile = (id: string) => {
    setExpandedMobile((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Solo se ofrecen las ciudades que realmente aparecen entre los clientes
  // cargados, tal cual quedaron escritas (es un campo libre, sin catálogo).
  const cityOptions = useMemo(() => {
    const set = new Set(
      customers.map((c) => c.city).filter((c): c is string => Boolean(c?.trim())),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const filtered = useMemo(() => {
    let list = cityFilter ? customers.filter((c) => c.city === cityFilter) : customers;

    const q = query.trim().toLowerCase();
    if (q) {
      const qDigits = q.replace(/\D/g, "");
      list = list.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(q);
        const phoneMatch = qDigits && c.phone ? c.phone.replace(/\D/g, "").includes(qDigits) : false;
        return nameMatch || phoneMatch;
      });
    }

    if (sortBy === "recent") {
      list = [...list].sort((a, b) => {
        if (!a.lastPurchaseAt && !b.lastPurchaseAt) return 0;
        if (!a.lastPurchaseAt) return 1;
        if (!b.lastPurchaseAt) return -1;
        return b.lastPurchaseAt.localeCompare(a.lastPurchaseAt);
      });
    } else if (sortBy === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [customers, query, cityFilter, sortBy]);

  const handleDelete = async (customer: CustomerWithStats) => {
    if (!window.confirm(`¿Eliminar «${customer.name}»? Sus ventas no se borran, solo dejan de estar vinculadas a este cliente.`)) {
      return;
    }
    setPendingId(customer.id);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar el cliente.");
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
        </p>
        <div className="row gap-2" style={{ flexWrap: "wrap" }}>
          <input
            type="search"
            className="admin-search"
            placeholder="Buscar por nombre o teléfono…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar clientes"
          />
          <select
            className="select"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            aria-label="Filtrar por ciudad"
          >
            <option value="">Todas las ciudades</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            aria-label="Ordenar clientes"
          >
            <option value="">Sin ordenar</option>
            <option value="recent">Compra más reciente primero</option>
            <option value="name">Nombre (A-Z)</option>
          </select>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="admin-empty">
          Todavía no hay clientes cargados. Se crean solos al registrar una
          venta con teléfono, o los podés agregar a mano.
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">Ningún cliente coincide con los filtros.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Ciudad</th>
                <th>Pedidos</th>
                <th>Total gastado</th>
                <th>Última compra</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isMobileOpen = expandedMobile.has(c.id);
                return (
                <tr key={c.id} data-expanded={isMobileOpen ? "true" : "false"}>
                  <td>
                    <button
                      type="button"
                      className="admin-table__row-toggle"
                      aria-expanded={isMobileOpen}
                      onClick={() => toggleMobile(c.id)}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        {c.notes ? <div className="meta">{c.notes}</div> : null}
                      </div>
                      <IconChevron className="icon--sm admin-table__row-chevron" />
                    </button>
                  </td>
                  <td data-label="Teléfono" className="admin-table__always-visible">
                    {c.phone || "—"}
                  </td>
                  <td data-label="Ciudad">{c.city || "—"}</td>
                  <td data-label="Pedidos">{c.orderCount}</td>
                  <td data-label="Total gastado">{formatPrice(c.totalSpent)}</td>
                  <td data-label="Última compra">
                    {c.lastPurchaseAt
                      ? dateFormatter.format(new Date(c.lastPurchaseAt))
                      : "—"}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/gestion-ssjblue/clientes/${c.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Ver
                      </Link>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Eliminar cliente"
                        title="Eliminar"
                        disabled={pendingId === c.id}
                        onClick={() => handleDelete(c)}
                      >
                        <IconTrash className="icon--sm" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
