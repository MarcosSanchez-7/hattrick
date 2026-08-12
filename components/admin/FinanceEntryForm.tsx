"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FinanceAccount, FinanceEntry, FinanceEntryType } from "@/lib/data";

const TYPES: { value: FinanceEntryType; label: string }[] = [
  { value: "ingreso", label: "Ingreso (otro, no de una venta)" },
  { value: "gasto", label: "Gasto" },
  { value: "capital_aporte", label: "Aporte de capital" },
  { value: "capital_retiro", label: "Retiro de capital" },
  { value: "importacion", label: "Importación" },
];

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function FinanceEntryForm({
  entry,
  accounts,
}: {
  entry?: FinanceEntry;
  accounts: FinanceAccount[];
}) {
  const router = useRouter();
  const isEdit = Boolean(entry);

  const [type, setType] = useState<FinanceEntryType>(entry?.type ?? "gasto");
  const [category, setCategory] = useState(entry?.category ?? "");
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [accountId, setAccountId] = useState(entry?.accountId ?? "");
  const [occurredAt, setOccurredAt] = useState(
    entry ? toDateInput(entry.occurredAt) : toDateInput(new Date().toISOString()),
  );
  const [note, setNote] = useState(entry?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("El monto debe ser mayor que 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/finance/entries/${entry!.id}` : "/api/admin/finance/entries",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            category: category.trim() || undefined,
            amount: amountNum,
            accountId: accountId || undefined,
            occurredAt: new Date(`${occurredAt}T12:00:00`).toISOString(),
            note: note.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el movimiento.");
      router.push("/gestion-ssjblue/finanzas/movimientos");
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
        <p className="admin-fieldset__title">Datos del movimiento</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="type">Tipo</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as FinanceEntryType)}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="amount">Monto (Gs.)</label>
            <input
              id="amount"
              type="number"
              min={0}
              step={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="category">Categoría (opcional)</label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej. Alquiler, Flete, Sueldos…"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="occurredAt">Fecha</label>
            <input
              id="occurredAt"
              type="date"
              required
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="accountId">Cuenta/tarjeta (opcional)</label>
          <select
            id="accountId"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">Sin cuenta asociada</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-field">
          <label htmlFor="note">Nota (opcional)</label>
          <input id="note" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/finanzas/movimientos")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar movimiento"}
        </button>
      </div>
    </form>
  );
}
