"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CustomBannerSettings,
  PersonalizationGalleryPost,
  PersonalizationGallerySettings,
} from "@/lib/settings";
import { ImageUploader } from "@/components/admin/ImageUploader";

function emptyPost(): PersonalizationGalleryPost {
  return { id: crypto.randomUUID(), image: "", caption: "" };
}

export function CustomBannerSettingsForm({
  initial,
  initialGallery,
}: {
  initial: CustomBannerSettings;
  initialGallery: PersonalizationGallerySettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CustomBannerSettings>(initial);
  const [points, setPoints] = useState(initial.points.join("\n"));
  const [gallery, setGallery] = useState<PersonalizationGallerySettings>(initialGallery);
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

  const updatePost = (id: string, patch: Partial<PersonalizationGalleryPost>) => {
    setSaved(false);
    setGallery((g) => ({
      posts: g.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const addPost = () => {
    setSaved(false);
    setGallery((g) => ({ posts: [...g.posts, emptyPost()] }));
  };

  const removePost = (id: string) => {
    setSaved(false);
    setGallery((g) => ({ posts: g.posts.filter((p) => p.id !== id) }));
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
      const [bannerRes, galleryRes] = await Promise.all([
        fetch("/api/admin/settings/customBanner", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        fetch("/api/admin/settings/personalizationGallery", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gallery),
        }),
      ]);
      const bannerData = await bannerRes.json();
      const galleryData = await galleryRes.json();
      if (!bannerRes.ok) throw new Error(bannerData.error ?? "No se pudo guardar.");
      if (!galleryRes.ok) throw new Error(galleryData.error ?? "No se pudo guardar.");
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
        <p className="admin-fieldset__title">Fotos de ejemplo</p>
        <p className="admin-help">
          Se muestran del lado derecho del banner. Con más de una, el
          cliente las ve deslizarse solas cada 5 segundos o con las flechas.
          Vacío = se usa la ilustración genérica.
        </p>
        <ImageUploader
          images={form.images}
          onChange={(images) => update("images", images)}
          max={8}
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
              placeholder="Costo adicional: Gs. 50.000"
            />
          </div>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Precio de personalización</p>
        <p className="admin-help">
          Precio real que se cobra por marcar &quot;Personalizado&quot; en la
          ficha de un producto — se suma al carrito y aparece en el mensaje
          de WhatsApp. El texto de arriba es solo lo que se muestra en este
          banner; este número es el que se usa en los cálculos.
        </p>
        <div className="admin-field" style={{ maxWidth: 220 }}>
          <label htmlFor="price">Precio (Gs.)</label>
          <input
            id="price"
            type="number"
            min={0}
            step={1000}
            value={form.price}
            onChange={(e) => update("price", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Galería de personalizaciones</p>
        <p className="admin-help">
          Fotos de personalizaciones ya entregadas (con o sin parches),
          mostradas en una grilla en /personalizacion. Vacío = la sección no
          se muestra.
        </p>
        <div className="stack gap-3">
          {gallery.posts.map((post) => (
            <div
              key={post.id}
              className="admin-form__grid admin-form__grid--3"
              style={{ alignItems: "start", borderTop: "1px solid var(--line)", paddingTop: 12 }}
            >
              <ImageUploader
                images={post.image ? [post.image] : []}
                onChange={(images) => updatePost(post.id, { image: images[0] ?? "" })}
                max={1}
                folder="personalization"
              />
              <div className="admin-field">
                <label htmlFor={`caption-${post.id}`}>Leyenda</label>
                <input
                  id={`caption-${post.id}`}
                  type="text"
                  value={post.caption}
                  onChange={(e) => updatePost(post.id, { caption: e.target.value })}
                  placeholder="Camiseta de River personalizada con parches"
                />
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => removePost(post.id)}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={addPost} style={{ marginTop: 12 }}>
          + Añadir foto
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
