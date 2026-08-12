"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandingSettings } from "@/lib/settings";
import { ImageUploader } from "@/components/admin/ImageUploader";

export function BrandingSettingsForm({ initial }: { initial: BrandingSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<BrandingSettings>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/branding", {
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

      <p className="admin-help">
        Mientras no subas nada acá, el sitio usa un ícono genérico ("H")
        generado automáticamente. Subí el logo definitivo cuando tengas el
        branding listo — se usa como favicon (pestaña del navegador) e ícono
        al agregar el sitio a la pantalla de inicio en celulares. Ideal:
        imagen cuadrada, fondo sólido, sin texto chico.
      </p>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Favicon / ícono del sitio</p>
        <ImageUploader
          images={form.faviconUrl ? [form.faviconUrl] : []}
          onChange={(images) => {
            setSaved(false);
            setForm((f) => ({ ...f, faviconUrl: images[0] ?? "" }));
          }}
          max={1}
          folder="branding"
          label="Logo cuadrado (mín. 180×180 px)"
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
