"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FinanceEntry, FinanceEntryType } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { IconTrash } from "@/components/ui/Icons";
import { PARAGUAY_TZ } from "@/lib/timezone";

const TYPE_LABEL: Record<FinanceEntryType, string> = {
  ingreso: "Ingreso",
  gasto: "Gasto",
  capital_aporte: "Aporte de capital",
  capital_retiro: "Retiro de capital",
  importacion: "Importación",
};

const dateFormatter = new Intl.DateTimeFormat("es-PY", {
  timeZone: PARAGUAY_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function FinanceEntriesTable({ entries }: { entries: FinanceEntry[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDelete = async (entry: FinanceEntry) => {
    if (!window.confirm(`¿Eliminar este movimiento (${TYPE_LABEL[entry.type]})?`)) return;
    setPendingId(entry.id);
    try {
      const res = await fetch(`/api/admin/finance/entries/${entry.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar el movimiento.");
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
          {entries.length} movimiento{entries.length !== 1 ? "s" : ""}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="admin-empty">No hay movimientos registrados en este rango.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Movimiento</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Cuenta</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{TYPE_LABEL[e.type]}</div>
                    <div className="meta">{e.category ?? e.note ?? "—"}</div>
                  </td>
                  <td className="meta" data-label="Fecha">
                    {dateFormatter.format(new Date(e.occurredAt))}
                  </td>
                  <td data-label="Monto">{formatPrice(e.amount)}</td>
                  <td className="meta" data-label="Cuenta">
                    {e.accountName ?? "—"}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/gestion-ssjblue/finanzas/movimientos/${e.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Eliminar movimiento"
                        title="Eliminar"
                        disabled={pendingId === e.id}
                        onClick={() => handleDelete(e)}
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
