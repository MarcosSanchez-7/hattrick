"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FinanceEntry } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { IconTrash } from "@/components/ui/Icons";
import { PARAGUAY_TZ } from "@/lib/timezone";

const KIND_LABEL: Record<string, string> = {
  fijo: "Fijo",
  variable: "Variable",
};

const dateFormatter = new Intl.DateTimeFormat("es-PY", {
  timeZone: PARAGUAY_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ExpensesTable({ expenses }: { expenses: FinanceEntry[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const total = expenses.reduce((acc, e) => acc + e.amount, 0);

  const handleDelete = async (expense: FinanceEntry) => {
    if (!window.confirm(`¿Eliminar este gasto (${expense.category ?? "sin categoría"})?`)) {
      return;
    }
    setPendingId(expense.id);
    try {
      const res = await fetch(`/api/admin/finance/entries/${expense.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar el gasto.");
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
          {expenses.length} gasto{expenses.length !== 1 ? "s" : ""}
        </p>
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          Total {formatPrice(total)}
        </p>
      </div>

      {expenses.length === 0 ? (
        <div className="admin-empty">No hay gastos registrados en este rango.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Gasto</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Cuenta</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.category ?? "Sin categoría"}</td>
                  <td className="meta" data-label="Tipo">
                    {e.expenseKind ? KIND_LABEL[e.expenseKind] : "—"}
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
                        href={`/gestion-ssjblue/finanzas/gastos/${e.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Eliminar gasto"
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
