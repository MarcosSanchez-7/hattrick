"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  descendantSlugs,
  orderCategoriesTree,
  type Category,
  type ProductNotice,
} from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { NoticesEditor } from "@/components/admin/NoticesEditor";

export function CategoryForm({
  category,
  categories,
  defaultParentSlug,
}: {
  category?: Category;
  categories: Category[];
  /** Preselecciona el padre al crear (viene de "Añadir subcategoría" en la lista). */
  defaultParentSlug?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(category);

  const [name, setName] = useState(category?.name ?? "");
  const [tagline, setTagline] = useState(category?.tagline ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [image, setImage] = useState<string[]>(
    category?.image ? [category.image] : [],
  );
  const [isVisible, setIsVisible] = useState(category?.isVisible ?? true);
  const [parentSlug, setParentSlug] = useState(
    category?.parentSlug ?? defaultParentSlug ?? "",
  );
  const [notices, setNotices] = useState<ProductNotice[]>(category?.notices ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedSlug = useMemo(() => slugify(name), [name]);

  // En modo edición, no se puede elegir a sí misma ni a ninguna de sus
  // propias subcategorías como padre (formaría un ciclo).
  const excluded = useMemo(() => {
    if (!category) return new Set<string>();
    return new Set([category.slug, ...descendantSlugs(categories, category.slug)]);
  }, [category, categories]);

  const parentOptions = useMemo(
    () =>
      orderCategoriesTree(categories).filter(
        ({ category: c }) => !excluded.has(c.slug),
      ),
    [categories, excluded],
  );

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
      parentSlug: parentSlug || null,
      notices: notices.filter((n) => n.text.trim()),
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
      router.push("/gestion-ssjblue/categorias");
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
          <label htmlFor="parentSlug">Categoría padre</label>
          <select
            id="parentSlug"
            value={parentSlug}
            onChange={(e) => setParentSlug(e.target.value)}
          >
            <option value="">— Ninguna (categoría raíz) —</option>
            {parentOptions.map(({ category: c, depth }) => (
              <option key={c.slug} value={c.slug}>
                {"— ".repeat(depth)}
                {c.name}
              </option>
            ))}
          </select>
          <p className="admin-help">
            Dejalo vacío para que sea una categoría de nivel superior, o
            elegí una para convertirla en subcategoría (ej. "NBA" dentro de
            "Importados").
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

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Avisos de esta categoría</p>
        <p className="admin-help">
          Se muestran en la ficha de los productos de esta categoría (y de
          sus subcategorías, si ellas no definen los suyos). Dejalo vacío
          para usar los avisos por defecto del sitio.
        </p>
        <NoticesEditor notices={notices} onChange={setNotices} />
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/categorias")}
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
