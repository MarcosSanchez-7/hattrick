"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WholesaleSettings } from "@/lib/settings";
import { ImageUploader } from "@/components/admin/ImageUploader";

export function WholesaleSettingsForm({ initial }: { initial: WholesaleSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<WholesaleSettings>(initial);
  const [points, setPoints] = useState(initial.points.join("\n"));
  const [teaserMessages, setTeaserMessages] = useState(initial.teaserMessages.join("\n"));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof WholesaleSettings>(key: K, value: WholesaleSettings[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: WholesaleSettings = {
        ...form,
        points: points
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
        teaserMessages: teaserMessages
          .split("\n")
          .map((m) => m.trim())
          .filter(Boolean),
      };
      const res = await fetch("/api/admin/settings/wholesale", {
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

      <p className="admin-help">
        Página /mayorista (venta por docena cerrada a precio especial, como
        canal extra) + el mensaje flotante que la promociona arriba del
        botón de WhatsApp en toda la tienda.
      </p>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Mensaje flotante</p>
        <div className="admin-field admin-field--checkbox">
          <input
            id="teaserEnabled"
            type="checkbox"
            checked={form.teaserEnabled}
            onChange={(e) => update("teaserEnabled", e.target.checked)}
          />
          <label htmlFor="teaserEnabled" style={{ marginBottom: 0 }}>
            Mostrar el mensaje flotante arriba de WhatsApp
          </label>
        </div>
        <p className="admin-help">
          Va rotando una frase a la vez cada 30 segundos mientras el
          visitante sigue en la tienda (no es un aviso único). Se puede
          cerrar, pero vuelve a salir en el próximo ciclo. Activalo cuando
          ya hayas revisado el contenido de la página de abajo.
        </p>
        <div className="admin-field" style={{ marginTop: 12 }}>
          <label htmlFor="teaserMessages">Frases que rotan (una por línea)</label>
          <textarea
            id="teaserMessages"
            value={teaserMessages}
            onChange={(e) => {
              setSaved(false);
              setTeaserMessages(e.target.value);
            }}
            rows={4}
            placeholder={"Precios mayoristas\nSuper precio por docena"}
          />
        </div>
        <div className="admin-field" style={{ marginTop: 12, maxWidth: 280 }}>
          <label htmlFor="teaserHref">A dónde manda</label>
          <input
            id="teaserHref"
            type="text"
            value={form.teaserHref}
            onChange={(e) => update("teaserHref", e.target.value)}
            placeholder="/mayorista"
          />
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Texto de la página</p>
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
          <textarea id="lead" value={form.lead} onChange={(e) => update("lead", e.target.value)} />
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
        <p className="admin-fieldset__title">Foto (opcional)</p>
        <p className="admin-help" style={{ marginTop: 0 }}>
          Vacío = se usa una ilustración genérica.
        </p>
        <ImageUploader
          images={form.image ? [form.image] : []}
          onChange={(images) => update("image", images[0] ?? "")}
          max={1}
          folder="wholesale"
        />
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
            <label htmlFor="priceLabel">Texto de precio junto al botón</label>
            <input
              id="priceLabel"
              type="text"
              value={form.priceLabel}
              onChange={(e) => update("priceLabel", e.target.value)}
            />
          </div>
        </div>
        <div className="admin-field" style={{ marginTop: 12 }}>
          <label htmlFor="whatsappMessage">Mensaje de WhatsApp al tocar el botón</label>
          <input
            id="whatsappMessage"
            type="text"
            value={form.whatsappMessage}
            onChange={(e) => update("whatsappMessage", e.target.value)}
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
