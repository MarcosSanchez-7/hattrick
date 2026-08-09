"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HeroSettings, HeroSlide } from "@/lib/settings";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { IconTrash } from "@/components/ui/Icons";

function emptySlide(): HeroSlide {
  return {
    id: crypto.randomUUID(),
    image: "",
    eyebrow: "",
    headline: "",
    ctaLabel: "",
    ctaHref: "",
  };
}

export function HeroSettingsForm({ initial }: { initial: HeroSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<HeroSettings>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateSlide = <K extends keyof HeroSlide>(
    id: string,
    key: K,
    value: HeroSlide[K],
  ) => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      slides: f.slides.map((s) => (s.id === id ? { ...s, [key]: value } : s)),
    }));
  };

  const addSlide = () => {
    setSaved(false);
    setForm((f) => ({ ...f, slides: [...f.slides, emptySlide()] }));
  };

  const removeSlide = (id: string) => {
    setSaved(false);
    setForm((f) => ({ ...f, slides: f.slides.filter((s) => s.id !== id) }));
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
    if (form.slides.length === 0) {
      setError("Agrega al menos un flyer.");
      return;
    }
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

      <p className="admin-help">
        Cada flyer ocupa toda la pantalla en la home. Si cargás más de uno, el
        cliente los recorre con flechas o puntos — no rotan solos.
      </p>

      {form.slides.map((slide, idx) => (
        <div key={slide.id} className="admin-fieldset">
          <div
            className="row"
            style={{ justifyContent: "space-between", marginBottom: 4 }}
          >
            <p className="admin-fieldset__title">Flyer {idx + 1}</p>
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn--danger"
              aria-label="Quitar flyer"
              title="Quitar flyer"
              onClick={() => removeSlide(slide.id)}
            >
              <IconTrash className="icon--sm" />
            </button>
          </div>

          <ImageUploader
            images={slide.image ? [slide.image] : []}
            onChange={(images) => updateSlide(slide.id, "image", images[0] ?? "")}
            max={1}
            label="Imagen del flyer (a pantalla completa)"
          />

          <div className="admin-form__grid" style={{ marginTop: 16 }}>
            <div className="admin-field">
              <label htmlFor={`eyebrow-${slide.id}`}>Texto pequeño superior</label>
              <input
                id={`eyebrow-${slide.id}`}
                type="text"
                value={slide.eyebrow}
                onChange={(e) => updateSlide(slide.id, "eyebrow", e.target.value)}
                placeholder="Temporada 25/26 · Mundial 2026"
              />
            </div>
            <div className="admin-field">
              <label htmlFor={`headline-${slide.id}`}>Titular</label>
              <input
                id={`headline-${slide.id}`}
                type="text"
                value={slide.headline}
                onChange={(e) => updateSlide(slide.id, "headline", e.target.value)}
                placeholder="La camiseta hace al equipo"
              />
            </div>
            <div className="admin-field">
              <label htmlFor={`ctaLabel-${slide.id}`}>Botón — texto</label>
              <input
                id={`ctaLabel-${slide.id}`}
                type="text"
                value={slide.ctaLabel}
                onChange={(e) => updateSlide(slide.id, "ctaLabel", e.target.value)}
                placeholder="Vacío = sin botón"
              />
            </div>
            <div className="admin-field">
              <label htmlFor={`ctaHref-${slide.id}`}>Botón — enlace</label>
              <input
                id={`ctaHref-${slide.id}`}
                type="text"
                value={slide.ctaHref}
                onChange={(e) => updateSlide(slide.id, "ctaHref", e.target.value)}
                placeholder="/novedades"
              />
            </div>
          </div>
        </div>
      ))}

      <div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={addSlide}>
          Añadir flyer
        </button>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Franja de datos (debajo del flyer)</p>
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
