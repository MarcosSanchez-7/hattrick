"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductInfoSettings } from "@/lib/settings";

export function ProductInfoSettingsForm({
  initial,
}: {
  initial: ProductInfoSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductInfoSettings>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/productInfo", {
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
        <p className="admin-fieldset__title">Envíos y devoluciones</p>
        <p className="admin-help">
          Texto que aparece en esa sección de la ficha de producto, igual
          para todo el catálogo.
        </p>
        <div className="admin-field">
          <label htmlFor="shippingText">Texto</label>
          <textarea
            id="shippingText"
            value={form.shippingText}
            onChange={(e) => {
              setSaved(false);
              setForm((f) => ({ ...f, shippingText: e.target.value }));
            }}
            rows={4}
          />
        </div>
      </div>

      <div className="admin-actions">
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
