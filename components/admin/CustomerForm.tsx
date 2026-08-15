"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/data";

export function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const isEdit = Boolean(customer);

  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [city, setCity] = useState(customer?.city ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/customers/${customer!.id}` : "/api/admin/customers",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim() || undefined,
            city: city.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el cliente.");
      router.push("/gestion-ssjblue/clientes");
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
        <p className="admin-fieldset__title">Datos del cliente</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre y apellido"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xx xxx xxx"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="city">Ciudad</label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Asunción, Ciudad del Este, etc."
            />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="notes">Notas (opcional)</label>
          <input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferencias, referencias, etc."
          />
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/clientes")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear cliente"}
        </button>
      </div>
    </form>
  );
}
