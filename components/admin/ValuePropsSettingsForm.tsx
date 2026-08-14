"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NoticeIcon } from "@/lib/catalog";
import type { ValuePropsSettings } from "@/lib/settings";
import { ICON_OPTIONS } from "@/components/admin/NoticesEditor";
import { IconTrash } from "@/components/ui/Icons";

function emptyItem() {
  return { icon: "truck" as NoticeIcon, title: "", text: "" };
}

export function ValuePropsSettingsForm({
  initial,
}: {
  initial: ValuePropsSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ValuePropsSettings>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = (idx: number, patch: Partial<ValuePropsSettings["items"][number]>) => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  };

  const add = () => {
    setSaved(false);
    setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  };

  const remove = (idx: number) => {
    setSaved(false);
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/valueProps", {
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
        Esta franja aparece justo debajo del Hero, en la home. Dejala vacía
        (sin ítems) para ocultar toda la sección.
      </p>

      {form.items.map((item, idx) => (
        <div key={idx} className="admin-fieldset">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
            <p className="admin-fieldset__title">Ítem {idx + 1}</p>
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn--danger"
              aria-label="Quitar ítem"
              title="Quitar ítem"
              onClick={() => remove(idx)}
            >
              <IconTrash className="icon--sm" />
            </button>
          </div>
          <div className="admin-form__grid">
            <div className="admin-field">
              <label htmlFor={`icon-${idx}`}>Ícono</label>
              <select
                id={`icon-${idx}`}
                value={item.icon}
                onChange={(e) => update(idx, { icon: e.target.value as NoticeIcon })}
              >
                {ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor={`title-${idx}`}>Título</label>
              <input
                id={`title-${idx}`}
                type="text"
                value={item.title}
                onChange={(e) => update(idx, { title: e.target.value })}
                placeholder="Envío en 48 h"
              />
            </div>
          </div>
          <div className="admin-field">
            <label htmlFor={`text-${idx}`}>Texto</label>
            <input
              id={`text-${idx}`}
              type="text"
              value={item.text}
              onChange={(e) => update(idx, { text: e.target.value })}
              placeholder="Gratuito a partir de Gs. 650.000."
            />
          </div>
        </div>
      ))}

      <div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={add}>
          Añadir ítem
        </button>
      </div>

      <div className="admin-actions">
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
