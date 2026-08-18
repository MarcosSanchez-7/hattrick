"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Patch } from "@/lib/catalog";
import { ImageUploader } from "@/components/admin/ImageUploader";

export function PatchForm({
  patch,
  existingCategories = [],
}: {
  patch?: Patch;
  existingCategories?: string[];
}) {
  const router = useRouter();
  const isEdit = Boolean(patch);

  const [name, setName] = useState(patch?.name ?? "");
  const [price, setPrice] = useState(patch ? String(patch.price) : "");
  const [images, setImages] = useState<string[]>(patch?.images ?? []);
  const [category, setCategory] = useState(patch?.category ?? "");
  const [isVisible, setIsVisible] = useState(patch?.isVisible ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("El precio no es válido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/patches/${patch!.id}` : "/api/admin/patches",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            price: priceNum,
            images,
            category: category.trim() || null,
            isVisible,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el parche.");
      router.push("/gestion-ssjblue/generales/parches");
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
        <p className="admin-fieldset__title">Datos del parche</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Champions League, Copa Libertadores…"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="price">Precio adicional (Gs.)</label>
            <input
              id="price"
              type="number"
              min={0}
              step={1000}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="category">Categoría (carpeta)</label>
            <input
              id="category"
              type="text"
              list="patch-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej. Parches europeos"
            />
            <datalist id="patch-categories">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="admin-field admin-field--checkbox">
            <input
              id="isVisible"
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
            />
            <label htmlFor="isVisible" style={{ marginBottom: 0 }}>
              Disponible para elegir
            </label>
          </div>
        </div>

        <div className="admin-field">
          <label>Imágenes del parche</label>
          <p className="admin-help" style={{ marginTop: 0 }}>
            Si es un conjunto de varias piezas (ej. Champions League son 2
            parchecitos), subí una imagen por cada una — el cliente las va a
            poder ver todas en la vista previa.
          </p>
          <ImageUploader
            images={images}
            onChange={setImages}
            max={4}
            folder="patches"
            label="Imágenes del parche"
          />
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/generales/parches")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear parche"}
        </button>
      </div>
    </form>
  );
}
