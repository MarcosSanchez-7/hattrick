"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FinanceAccount, FinanceAccountKind } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { IconTrash } from "@/components/ui/Icons";

const KIND_LABEL: Record<FinanceAccountKind, string> = {
  efectivo: "Efectivo",
  cuenta_bancaria: "Cuenta bancaria",
  tarjeta_credito: "Tarjeta de crédito",
  tarjeta_debito: "Tarjeta de débito",
};

export function FinanceAccountsTable({ accounts }: { accounts: FinanceAccount[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDelete = async (account: FinanceAccount) => {
    if (!window.confirm(`¿Eliminar «${account.name}»?`)) return;
    setPendingId(account.id);
    try {
      const res = await fetch(`/api/admin/finance/accounts/${account.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar la cuenta.");
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
          {accounts.length} cuenta{accounts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="admin-empty">Todavía no has creado ninguna cuenta o tarjeta.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Tipo</th>
                <th>Saldo disponible</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td className="meta" data-label="Tipo">
                    {KIND_LABEL[a.kind]}
                  </td>
                  <td data-label="Saldo disponible">{formatPrice(a.balance)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/gestion-ssjblue/finanzas/cuentas/${a.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Eliminar cuenta"
                        title="Eliminar"
                        disabled={pendingId === a.id}
                        onClick={() => handleDelete(a)}
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
