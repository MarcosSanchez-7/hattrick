"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CustomerWithStats } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { IconTrash } from "@/components/ui/Icons";

const dateFormatter = new Intl.DateTimeFormat("es-PY", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

export function CustomersTable({ customers }: { customers: CustomerWithStats[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

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
          {customers.length} cliente{customers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="admin-empty">
          Todavía no hay clientes cargados. Se crean solos al registrar una
          venta con teléfono, o los podés agregar a mano.
        </div>
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
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    {c.notes ? <div className="meta">{c.notes}</div> : null}
                  </td>
                  <td data-label="Teléfono">{c.phone || "—"}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
