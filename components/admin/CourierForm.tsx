"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ImportCourier } from "@/lib/data";

export function CourierForm({ courier }: { courier?: ImportCourier }) {
  const router = useRouter();
  const isEdit = Boolean(courier);

  const [name, setName] = useState(courier?.name ?? "");
  const [costPerKg, setCostPerKg] = useState(courier ? String(courier.costPerKg) : "");
  const [note, setNote] = useState(courier?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const costNum = Number(costPerKg);
    if (!Number.isFinite(costNum) || costNum < 0) {
      setError("El costo por kilo no es válido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit
          ? `/api/admin/finance/import-couriers/${courier!.id}`
          : "/api/admin/finance/import-couriers",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            costPerKg: costNum,
            note: note.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el courier.");
      router.push("/gestion-ssjblue/finanzas/importaciones/couriers");
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
        <p className="admin-fieldset__title">Datos del courier</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. DHL, EMS, Agencia local…"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="costPerKg">Costo por kilo (Gs.)</label>
            <input
              id="costPerKg"
              type="number"
              min={0}
              step={1}
              required
              value={costPerKg}
              onChange={(e) => setCostPerKg(e.target.value)}
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
          onClick={() => router.push("/gestion-ssjblue/finanzas/importaciones/couriers")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear courier"}
        </button>
      </div>
    </form>
  );
}
