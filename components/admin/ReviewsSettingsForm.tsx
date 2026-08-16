"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewItem, ReviewsSettings } from "@/lib/settings";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { IconTrash } from "@/components/ui/Icons";

function emptyItem(): ReviewItem {
  return { id: crypto.randomUUID(), image: "", caption: "" };
}

export function ReviewsSettingsForm({ initial }: { initial: ReviewsSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<ReviewsSettings>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateItem = <K extends keyof ReviewItem>(id: string, key: K, value: ReviewItem[K]) => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      items: f.items.map((it) => (it.id === id ? { ...it, [key]: value } : it)),
    }));
  };

  const addItem = () => {
    setSaved(false);
    setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  };

  const removeItem = (id: string) => {
    setSaved(false);
    setForm((f) => ({ ...f, items: f.items.filter((it) => it.id !== id) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/reviews", {
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
        Capturas de conversaciones de entrega o paquetes listos para envío.
        Se muestran en una sección "Reseñas" en la home, antes del footer.
        Vacío = la sección no se muestra.
      </p>

      {form.items.map((item, idx) => (
        <div key={item.id} className="admin-fieldset">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
            <p className="admin-fieldset__title">Foto {idx + 1}</p>
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn--danger"
              aria-label="Quitar foto"
              title="Quitar foto"
              onClick={() => removeItem(item.id)}
            >
              <IconTrash className="icon--sm" />
            </button>
          </div>

          <ImageUploader
            images={item.image ? [item.image] : []}
            onChange={(images) => updateItem(item.id, "image", images[0] ?? "")}
            max={1}
            folder="reviews"
          />

          <div className="admin-field" style={{ marginTop: 16 }}>
            <label htmlFor={`caption-${item.id}`}>Leyenda (opcional)</label>
            <input
              id={`caption-${item.id}`}
              type="text"
              value={item.caption}
              onChange={(e) => updateItem(item.id, "caption", e.target.value)}
              placeholder="Entrega en Asunción, agosto 2026"
            />
          </div>
        </div>
      ))}

      <div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={addItem}>
          Añadir foto
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
