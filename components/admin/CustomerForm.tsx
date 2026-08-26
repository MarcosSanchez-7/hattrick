"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/data";
import { LocationPicker, type LatLng } from "@/components/admin/LocationPicker";

export function CustomerForm({
  customer,
  onCancel,
  onSaved,
}: {
  customer?: Customer;
  /** Por defecto vuelve al listado — se puede pisar (ej. volver a modo lectura en la misma página). */
  onCancel?: () => void;
  /** Por defecto vuelve al listado tras guardar — se puede pisar. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(customer);

  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [city, setCity] = useState(customer?.city ?? "");
  const [neighborhood, setNeighborhood] = useState(customer?.neighborhood ?? "");
  const [location, setLocation] = useState<LatLng | null>(
    customer?.latitude != null && customer?.longitude != null
      ? { lat: customer.latitude, lng: customer.longitude }
      : null,
  );
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
            neighborhood: neighborhood.trim() || undefined,
            latitude: location?.lat ?? null,
            longitude: location?.lng ?? null,
            notes: notes.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el cliente.");
      if (onSaved) onSaved();
      else router.push("/gestion-ssjblue/clientes");
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
          <div className="admin-field">
            <label htmlFor="neighborhood">Barrio</label>
            <input
              id="neighborhood"
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Barrio Obrero, San Vicente, etc."
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

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Ubicación de entrega</p>
        <p className="admin-help">
          Tocá el mapa para marcar dónde entregar los pedidos de este
          cliente. Queda guardado y se reusa en futuras ventas.
        </p>
        <LocationPicker value={location} onChange={setLocation} />
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => (onCancel ? onCancel() : router.push("/gestion-ssjblue/clientes"))}
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
