"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HeroSettings } from "@/lib/settings";

export function HeroSettingsForm({ initial }: { initial: HeroSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<HeroSettings>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof HeroSettings>(key: K, value: HeroSettings[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const updateStat = (idx: number, key: "value" | "label", value: string) => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      stats: f.stats.map((s, i) => (i === idx ? { ...s, [key]: value } : s)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/hero", {
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
        <p className="admin-fieldset__title">Texto principal</p>
        <div className="admin-field">
          <label htmlFor="eyebrow">Texto pequeño superior</label>
          <input
            id="eyebrow"
            type="text"
            value={form.eyebrow}
            onChange={(e) => update("eyebrow", e.target.value)}
          />
        </div>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="headlineLine1">Titular, línea 1</label>
            <input
              id="headlineLine1"
              type="text"
              value={form.headlineLine1}
              onChange={(e) => update("headlineLine1", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="headlineLine2">Titular, línea 2</label>
            <input
              id="headlineLine2"
              type="text"
              value={form.headlineLine2}
              onChange={(e) => update("headlineLine2", e.target.value)}
            />
          </div>
        </div>
        <div className="admin-field">
          <label htmlFor="lead">Texto descriptivo</label>
          <textarea
            id="lead"
            value={form.lead}
            onChange={(e) => update("lead", e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="featuredProductSlug">
            Slug del producto destacado (opcional)
          </label>
          <input
            id="featuredProductSlug"
            type="text"
            value={form.featuredProductSlug}
            onChange={(e) => update("featuredProductSlug", e.target.value)}
            placeholder="Vacío = se elige uno automáticamente"
          />
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Botones</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="primaryCtaLabel">Botón principal — texto</label>
            <input
              id="primaryCtaLabel"
              type="text"
              value={form.primaryCtaLabel}
              onChange={(e) => update("primaryCtaLabel", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="primaryCtaHref">Botón principal — enlace</label>
            <input
              id="primaryCtaHref"
              type="text"
              value={form.primaryCtaHref}
              onChange={(e) => update("primaryCtaHref", e.target.value)}
              placeholder="/novedades"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="secondaryCtaLabel">Botón secundario — texto</label>
            <input
              id="secondaryCtaLabel"
              type="text"
              value={form.secondaryCtaLabel}
              onChange={(e) => update("secondaryCtaLabel", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="secondaryCtaHref">Botón secundario — enlace</label>
            <input
              id="secondaryCtaHref"
              type="text"
              value={form.secondaryCtaHref}
              onChange={(e) => update("secondaryCtaHref", e.target.value)}
              placeholder="/ofertas"
            />
          </div>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Estadísticas (3 datos bajo los botones)</p>
        <div className="admin-form__grid admin-form__grid--3">
          {form.stats.map((stat, idx) => (
            <div key={idx} className="admin-field">
              <label htmlFor={`stat-value-${idx}`}>Valor</label>
              <input
                id={`stat-value-${idx}`}
                type="text"
                value={stat.value}
                onChange={(e) => updateStat(idx, "value", e.target.value)}
              />
              <label htmlFor={`stat-label-${idx}`} style={{ marginTop: 8 }}>
                Descripción
              </label>
              <input
                id={`stat-label-${idx}`}
                type="text"
                value={stat.label}
                onChange={(e) => updateStat(idx, "label", e.target.value)}
              />
            </div>
          ))}
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
