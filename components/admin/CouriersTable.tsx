"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ImportCourier } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { IconTrash } from "@/components/ui/Icons";

export function CouriersTable({ couriers }: { couriers: ImportCourier[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDelete = async (courier: ImportCourier) => {
    if (!window.confirm(`¿Eliminar «${courier.name}»?`)) return;
    setPendingId(courier.id);
    try {
      const res = await fetch(`/api/admin/finance/import-couriers/${courier.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar el courier.");
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
          {couriers.length} courier{couriers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {couriers.length === 0 ? (
        <div className="admin-empty">Todavía no has creado ningún courier.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Courier</th>
                <th>Costo por kilo</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {couriers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    {c.note ? <div className="meta">{c.note}</div> : null}
                  </td>
                  <td data-label="Costo por kilo">{formatPrice(c.costPerKg)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/gestion-ssjblue/finanzas/importaciones/couriers/${c.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Eliminar courier"
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
