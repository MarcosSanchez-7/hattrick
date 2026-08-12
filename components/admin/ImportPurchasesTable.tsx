"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ImportPurchase } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { IconTrash } from "@/components/ui/Icons";

const dateFormatter = new Intl.DateTimeFormat("es-PY", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ImportPurchasesTable({ purchases }: { purchases: ImportPurchase[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const total = purchases.reduce((acc, p) => acc + p.totalGs, 0);

  const handleDelete = async (purchase: ImportPurchase) => {
    if (!window.confirm(`¿Eliminar la importación de «${purchase.productName}»?`)) return;
    setPendingId(purchase.id);
    try {
      const res = await fetch(`/api/admin/finance/import-purchases/${purchase.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar la importación.");
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
          {purchases.length} importación{purchases.length !== 1 ? "es" : ""}
        </p>
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          Total {formatPrice(total)}
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="admin-empty">No hay importaciones registradas en este rango.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Fecha</th>
                <th>Courier</th>
                <th>Peso</th>
                <th>Costo USD</th>
                <th>Total (Gs.)</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.productName}</td>
                  <td className="meta" data-label="Fecha">
                    {dateFormatter.format(new Date(p.purchasedAt))}
                  </td>
                  <td className="meta" data-label="Courier">
                    {p.courierName}
                  </td>
                  <td data-label="Peso">{p.weightKg} kg</td>
                  <td data-label="Costo USD">US$ {p.costUsd.toLocaleString("es-PY")}</td>
                  <td data-label="Total (Gs.)" style={{ fontWeight: 600 }}>
                    {formatPrice(p.totalGs)}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/gestion-ssjblue/finanzas/importaciones/${p.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Eliminar importación"
                        title="Eliminar"
                        disabled={pendingId === p.id}
                        onClick={() => handleDelete(p)}
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
