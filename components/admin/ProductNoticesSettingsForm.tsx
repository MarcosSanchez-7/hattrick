"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductNoticesSettings } from "@/lib/settings";
import { NoticesEditor } from "@/components/admin/NoticesEditor";

export function ProductNoticesSettingsForm({
  initial,
}: {
  initial: ProductNoticesSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductNoticesSettings>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/productNotices", {
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
        <p className="admin-fieldset__title">Avisos por defecto</p>
        <p className="admin-help">
          Se muestran en la ficha de cualquier producto cuya categoría (o
          alguna de sus categorías superiores) no tenga avisos propios
          configurados.
        </p>
        <NoticesEditor
          notices={form.defaultNotices}
          onChange={(defaultNotices) => {
            setSaved(false);
            setForm({ defaultNotices });
          }}
        />
      </div>

      <div className="admin-actions">
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
