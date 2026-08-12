"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MerchandisePurchase } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { IconTrash } from "@/components/ui/Icons";

const dateFormatter = new Intl.DateTimeFormat("es-PY", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function PurchasesTable({ purchases }: { purchases: MerchandisePurchase[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const totalGastado = purchases.reduce((acc, p) => acc + p.unitCost * p.quantity, 0);

  const handleDelete = async (purchase: MerchandisePurchase) => {
    if (!window.confirm(`¿Eliminar la compra de «${purchase.productName}»?`)) return;
    setPendingId(purchase.id);
    try {
      const res = await fetch(`/api/admin/finance/purchases/${purchase.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar la compra.");
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
          {purchases.length} compra{purchases.length !== 1 ? "s" : ""}
        </p>
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          Total {formatPrice(totalGastado)}
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="admin-empty">No hay compras registradas en este rango.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Fecha</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Total</th>
                <th>Proveedor</th>
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
                  <td data-label="Cantidad">{p.quantity}</td>
                  <td data-label="Precio unitario">{formatPrice(p.unitCost)}</td>
                  <td data-label="Total" style={{ fontWeight: 600 }}>
                    {formatPrice(p.unitCost * p.quantity)}
                  </td>
                  <td className="meta" data-label="Proveedor">
                    {p.supplier ?? "—"}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/gestion-ssjblue/finanzas/compras/${p.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Eliminar compra"
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
