"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomBannerSettings } from "@/lib/settings";

export function CustomBannerSettingsForm({
  initial,
}: {
  initial: CustomBannerSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CustomBannerSettings>(initial);
  const [points, setPoints] = useState(initial.points.join("\n"));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof CustomBannerSettings>(
    key: K,
    value: CustomBannerSettings[K],
  ) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: CustomBannerSettings = {
        ...form,
        points: points
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
      };
      const res = await fetch("/api/admin/settings/customBanner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        <p className="admin-fieldset__title">Texto</p>
        <div className="admin-field">
          <label htmlFor="eyebrow">Texto pequeño superior</label>
          <input
            id="eyebrow"
            type="text"
            value={form.eyebrow}
            onChange={(e) => update("eyebrow", e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="title">Título</label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="lead">Descripción</label>
          <textarea
            id="lead"
            value={form.lead}
            onChange={(e) => update("lead", e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="points">Lista de puntos (uno por línea)</label>
          <textarea
            id="points"
            value={points}
            onChange={(e) => {
              setSaved(false);
              setPoints(e.target.value);
            }}
            rows={5}
          />
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Botón</p>
        <div className="admin-form__grid admin-form__grid--3">
          <div className="admin-field">
            <label htmlFor="ctaLabel">Texto del botón</label>
            <input
              id="ctaLabel"
              type="text"
              value={form.ctaLabel}
              onChange={(e) => update("ctaLabel", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="ctaHref">Enlace del botón</label>
            <input
              id="ctaHref"
              type="text"
              value={form.ctaHref}
              onChange={(e) => update("ctaHref", e.target.value)}
              placeholder="/personalizacion"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="priceLabel">Texto de precio junto al botón</label>
            <input
              id="priceLabel"
              type="text"
              value={form.priceLabel}
              onChange={(e) => update("priceLabel", e.target.value)}
              placeholder="Desde Gs. 120.000"
            />
          </div>
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
