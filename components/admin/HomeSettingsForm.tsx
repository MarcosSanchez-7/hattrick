"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeSettings } from "@/lib/settings";

export function HomeSettingsForm({ initial }: { initial: HomeSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<HomeSettings>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setSaved(true);
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
      {saved ? <p className="admin-notice-ok">Cambios guardados.</p> : null}

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Secciones de la home</p>
        <div className="admin-field admin-field--checkbox">
          <input
            id="showNewArrivals"
            type="checkbox"
            checked={form.showNewArrivals}
            onChange={(e) =>
              setForm((f) => {
                setSaved(false);
                return { ...f, showNewArrivals: e.target.checked };
              })
            }
          />
          <label htmlFor="showNewArrivals" style={{ marginBottom: 0 }}>
            Mostrar &quot;Nuevos ingresos&quot;
          </label>
        </div>
        <p className="admin-help">
          Activala solo cuando cargues bastante mercadería nueva de una — si
          hay poca, mejor mantenerla apagada.
        </p>
      </div>

      <div className="admin-actions">
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
