"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExpenseKind, FinanceAccount, FinanceEntry } from "@/lib/data";

const KINDS: { value: ExpenseKind; label: string; help: string }[] = [
  { value: "fijo", label: "Fijo", help: "Se repite mes a mes (alquiler, sueldos, internet…)." },
  { value: "variable", label: "Variable", help: "Cambia cada vez (luz, insumos puntuales…)." },
];

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function ExpenseForm({
  expense,
  accounts,
}: {
  expense?: FinanceEntry;
  accounts: FinanceAccount[];
}) {
  const router = useRouter();
  const isEdit = Boolean(expense);

  const [expenseKind, setExpenseKind] = useState<ExpenseKind>(expense?.expenseKind ?? "variable");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [accountId, setAccountId] = useState(expense?.accountId ?? "");
  const [occurredAt, setOccurredAt] = useState(
    expense ? toDateInput(expense.occurredAt) : toDateInput(new Date().toISOString()),
  );
  const [note, setNote] = useState(expense?.note ?? "");
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
    if (!category.trim()) {
      setError("La categoría es obligatoria (ej. Alquiler, Luz, Sueldos…).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/finance/entries/${expense!.id}` : "/api/admin/finance/entries",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "gasto",
            expenseKind,
            category: category.trim(),
            amount: amountNum,
            accountId: accountId || undefined,
            occurredAt: new Date(`${occurredAt}T12:00:00`).toISOString(),
            note: note.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el gasto.");
      router.push("/gestion-ssjblue/finanzas/gastos");
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
        <p className="admin-fieldset__title">Tipo de gasto</p>
        <div className="admin-checklist">
          {KINDS.map(({ value, label }) => (
            <label
              key={value}
              className="admin-check"
              data-checked={expenseKind === value ? "true" : "false"}
            >
              <input
                type="radio"
                name="expenseKind"
                checked={expenseKind === value}
                onChange={() => setExpenseKind(value)}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="admin-help">{KINDS.find((k) => k.value === expenseKind)?.help}</p>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Datos del gasto</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="category">Categoría</label>
            <input
              id="category"
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej. Alquiler, Luz, Sueldos, Insumos…"
            />
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
          <label htmlFor="note">Nota (opcional)</label>
          <input id="note" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/finanzas/gastos")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar gasto"}
        </button>
      </div>
    </form>
  );
}
