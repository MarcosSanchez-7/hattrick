"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WholesaleSettings } from "@/lib/settings";
import { ImageUploader } from "@/components/admin/ImageUploader";

export function WholesaleSettingsForm({ initial }: { initial: WholesaleSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<WholesaleSettings>(initial);
  const [points, setPoints] = useState(initial.points.join("\n"));
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
          Aparece a los pocos segundos y se queda fija hasta que el
          visitante la cierra con la X (no se oculta sola). Una vez
          cerrada, no vuelve a salir en esa misma visita. Activalo cuando
          ya hayas revisado el contenido de la página de abajo.
        </p>
        <div className="admin-form__grid admin-form__grid--3" style={{ marginTop: 12 }}>
          <div className="admin-field">
            <label htmlFor="teaserText">Texto del mensaje</label>
            <input
              id="teaserText"
              type="text"
              value={form.teaserText}
              onChange={(e) => update("teaserText", e.target.value)}
              placeholder="Precios mayoristas"
            />
          </div>
          <div className="admin-field">
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
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Franja en la home</p>
        <div className="admin-field admin-field--checkbox">
          <input
            id="homeBannerEnabled"
            type="checkbox"
            checked={form.homeBannerEnabled}
            onChange={(e) => update("homeBannerEnabled", e.target.checked)}
          />
          <label htmlFor="homeBannerEnabled" style={{ marginBottom: 0 }}>
            Mostrar la franja al final de la home
          </label>
        </div>
        <p className="admin-help">
          Franja chica después de &quot;Reseñas&quot;, independiente del
          mensaje flotante — podés activar una sin la otra.
        </p>
        <div className="admin-form__grid admin-form__grid--3" style={{ marginTop: 12 }}>
          <div className="admin-field">
            <label htmlFor="homeBannerEyebrow">Texto pequeño superior</label>
            <input
              id="homeBannerEyebrow"
              type="text"
              value={form.homeBannerEyebrow}
              onChange={(e) => update("homeBannerEyebrow", e.target.value)}
              placeholder="Ventas al por mayor"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="homeBannerTitle">Título</label>
            <input
              id="homeBannerTitle"
              type="text"
              value={form.homeBannerTitle}
              onChange={(e) => update("homeBannerTitle", e.target.value)}
              placeholder="Precios especiales por cantidad"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="homeBannerCtaLabel">Texto del botón</label>
            <input
              id="homeBannerCtaLabel"
              type="text"
              value={form.homeBannerCtaLabel}
              onChange={(e) => update("homeBannerCtaLabel", e.target.value)}
              placeholder="Ver precios mayoristas"
            />
          </div>
        </div>
        <p className="admin-help">El botón manda a lo mismo que &quot;A dónde manda&quot; de arriba.</p>
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
