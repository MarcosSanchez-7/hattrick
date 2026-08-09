"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import { ImageUploader } from "@/components/admin/ImageUploader";

export function CategoryForm({ category }: { category?: Category }) {
  const router = useRouter();
  const isEdit = Boolean(category);

  const [name, setName] = useState(category?.name ?? "");
  const [tagline, setTagline] = useState(category?.tagline ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [image, setImage] = useState<string[]>(
    category?.image ? [category.image] : [],
  );
  const [isVisible, setIsVisible] = useState(category?.isVisible ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedSlug = useMemo(() => slugify(name), [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !tagline.trim() || !description.trim()) {
      setError("Completa nombre, eslogan y descripción.");
      return;
    }

    const payload = {
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      image: image[0] ?? null,
      isVisible,
    };

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit
          ? `/api/admin/categories/${category!.slug}`
          : "/api/admin/categories",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo guardar la categoría.");
      }
      router.push("/admin/categorias");
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

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Datos de la categoría</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Clubes"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="tagline">Eslogan corto</label>
            <input
              id="tagline"
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Las equipaciones de las cinco grandes ligas"
            />
          </div>
        </div>
        <div className="admin-field">
          <label>URL (slug)</label>
          <p className="admin-help">
            /categoria/{isEdit ? category!.slug : suggestedSlug || "…"}
            {isEdit ? " — no se puede cambiar una vez creada." : ""}
          </p>
        </div>
        <div className="admin-field">
          <label htmlFor="description">Descripción</label>
          <textarea
            id="description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Qué encontrará el cliente en esta sección…"
          />
        </div>
        <div className="admin-field admin-field--checkbox">
          <input
            id="isVisible"
            type="checkbox"
            checked={isVisible}
            onChange={(e) => setIsVisible(e.target.checked)}
          />
          <label htmlFor="isVisible" style={{ marginBottom: 0 }}>
            Visible en la tienda
          </label>
        </div>
        {!isVisible ? (
          <p className="admin-help">
            Al ocultar la categoría, sus productos también dejan de verse en
            toda la tienda, no solo en el menú.
          </p>
        ) : null}
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Imagen de portada</p>
        <ImageUploader images={image} onChange={setImage} max={1} />
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/admin/categorias")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting
            ? "Guardando…"
            : isEdit
              ? "Guardar cambios"
              : "Crear categoría"}
        </button>
      </div>
    </form>
  );
}
