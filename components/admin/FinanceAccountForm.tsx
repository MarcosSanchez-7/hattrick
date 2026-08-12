"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FinanceAccount, FinanceAccountKind } from "@/lib/data";

const KINDS: { value: FinanceAccountKind; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "cuenta_bancaria", label: "Cuenta bancaria" },
  { value: "tarjeta_credito", label: "Tarjeta de crédito" },
  { value: "tarjeta_debito", label: "Tarjeta de débito" },
];

export function FinanceAccountForm({ account }: { account?: FinanceAccount }) {
  const router = useRouter();
  const isEdit = Boolean(account);

  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<FinanceAccountKind>(account?.kind ?? "efectivo");
  const [balance, setBalance] = useState(account ? String(account.balance) : "0");
  const [notes, setNotes] = useState(account?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const balanceNum = Number(balance);
    if (!Number.isFinite(balanceNum)) {
      setError("El saldo no es válido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/finance/accounts/${account!.id}` : "/api/admin/finance/accounts",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            kind,
            balance: balanceNum,
            notes: notes.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar la cuenta.");
      router.push("/gestion-ssjblue/finanzas/cuentas");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Datos de la cuenta</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Tarjeta Visa Ueno"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="kind">Tipo</label>
            <select
              id="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as FinanceAccountKind)}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="balance">Saldo disponible (Gs.)</label>
          <input
            id="balance"
            type="number"
            step={1}
            required
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
          <p className="admin-help">
            Lo actualizás vos mismo cuando cambie — no se calcula solo.
          </p>
        </div>

        <div className="admin-field">
          <label htmlFor="notes">Notas (opcional)</label>
          <input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/finanzas/cuentas")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear cuenta"}
        </button>
      </div>
    </form>
  );
}
