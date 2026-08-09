"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FooterSettings } from "@/lib/settings";

export function FooterSettingsForm({ initial }: { initial: FooterSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<FooterSettings>(initial);
  const [paymentMethods, setPaymentMethods] = useState(
    initial.paymentMethods.join(", "),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof FooterSettings>(
    key: K,
    value: FooterSettings[K],
  ) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: FooterSettings = {
        ...form,
        paymentMethods: paymentMethods
          .split(",")
          .map((m) => m.trim().toUpperCase())
          .filter(Boolean),
      };
      const res = await fetch("/api/admin/settings/footer", {
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
        <p className="admin-fieldset__title">Marca</p>
        <div className="admin-field">
          <label htmlFor="brandDescription">Descripción bajo el logo</label>
          <textarea
            id="brandDescription"
            value={form.brandDescription}
            onChange={(e) => update("brandDescription", e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="legalName">Nombre legal (línea de copyright)</label>
          <input
            id="legalName"
            type="text"
            value={form.legalName}
            onChange={(e) => update("legalName", e.target.value)}
          />
          <p className="admin-help">
            Se muestra como «© {new Date().getFullYear()} {form.legalName || "…"}»
          </p>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Redes sociales</p>
        <p className="admin-help">Deja vacío para no mostrar ese icono.</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="instagramUrl">Instagram</label>
            <input
              id="instagramUrl"
              type="url"
              value={form.instagramUrl}
              onChange={(e) => update("instagramUrl", e.target.value)}
              placeholder="https://instagram.com/tu_tienda"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="tiktokUrl">TikTok</label>
            <input
              id="tiktokUrl"
              type="url"
              value={form.tiktokUrl}
              onChange={(e) => update("tiktokUrl", e.target.value)}
              placeholder="https://tiktok.com/@tu_tienda"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="xUrl">X (Twitter)</label>
            <input
              id="xUrl"
              type="url"
              value={form.xUrl}
              onChange={(e) => update("xUrl", e.target.value)}
              placeholder="https://x.com/tu_tienda"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="youtubeUrl">YouTube</label>
            <input
              id="youtubeUrl"
              type="url"
              value={form.youtubeUrl}
              onChange={(e) => update("youtubeUrl", e.target.value)}
              placeholder="https://youtube.com/@tu_tienda"
            />
          </div>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Métodos de pago mostrados</p>
        <div className="admin-field">
          <label htmlFor="paymentMethods">Separados por comas</label>
          <input
            id="paymentMethods"
            type="text"
            value={paymentMethods}
            onChange={(e) => {
              setSaved(false);
              setPaymentMethods(e.target.value);
            }}
            placeholder="VISA, MASTERCARD, TRANSFERENCIA, EFECTIVO"
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
