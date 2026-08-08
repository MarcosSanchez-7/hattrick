"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PATTERNS,
  SIZES_ADULT,
  SIZES_KIDS,
  type Category,
  type Pattern,
  type Product,
} from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import { ImageUploader } from "@/components/admin/ImageUploader";

const ALL_SIZES = [...SIZES_ADULT, ...SIZES_KIDS];

type FormState = {
  team: string;
  name: string;
  category: string;
  league: string;
  season: string;
  price: string;
  compareAt: string;
  isNew: boolean;
  rating: string;
  reviews: string;
  sizes: string[];
  soldOut: string[];
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  pattern: Pattern;
  description: string;
  tags: string;
  images: string[];
  slug: string;
};

function toFormState(product?: Product): FormState {
  return {
    team: product?.team ?? "",
    name: product?.name ?? "",
    category: product?.category ?? "",
    league: product?.league ?? "",
    season: product?.season ?? "25/26",
    price: product ? String(product.price) : "",
    compareAt: product?.compareAt != null ? String(product.compareAt) : "",
    isNew: product?.isNew ?? false,
    rating: product ? String(product.rating) : "5",
    reviews: product ? String(product.reviews) : "0",
    sizes: product?.sizes ?? [...SIZES_ADULT],
    soldOut: product?.soldOut ?? [],
    colorPrimary: product?.colors.primary ?? "#111111",
    colorSecondary: product?.colors.secondary ?? "#f2f2f2",
    colorAccent: product?.colors.accent ?? "#d4af37",
    pattern: product?.pattern ?? "solid",
    description: product?.description ?? "",
    tags: product?.tags.join(", ") ?? "",
    images: product?.images ?? [],
    slug: product?.slug ?? "",
  };
}

export function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: Product;
}) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [form, setForm] = useState<FormState>(() => toFormState(product));
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedSlug = useMemo(
    () => slugify(`${form.team} ${form.name}`),
    [form.team, form.name],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleInList = (key: "sizes" | "soldOut", value: string) => {
    setForm((f) => {
      const list = f[key];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      return { ...f, [key]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = Number(form.price);
    const compareAt = form.compareAt.trim() ? Number(form.compareAt) : null;

    if (!form.category) {
      setError("Selecciona una categoría.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Introduce un precio válido.");
      return;
    }
    if (form.sizes.length === 0) {
      setError("Selecciona al menos una talla.");
      return;
    }

    const payload = {
      team: form.team.trim(),
      name: form.name.trim(),
      category: form.category,
      league: form.league.trim(),
      season: form.season.trim(),
      price,
      compareAt,
      isNew: form.isNew,
      rating: Number(form.rating) || 5,
      reviews: Number(form.reviews) || 0,
      sizes: form.sizes,
      soldOut: form.soldOut.filter((s) => form.sizes.includes(s)),
      colors: {
        primary: form.colorPrimary,
        secondary: form.colorSecondary,
        accent: form.colorAccent,
      },
      pattern: form.pattern,
      description: form.description.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images: form.images,
      slug: (slugTouched ? form.slug : suggestedSlug).trim() || undefined,
    };

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el producto.");
      router.push("/admin/productos");
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
        <p className="admin-fieldset__title">Datos principales</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="team">Equipo / marca</label>
            <input
              id="team"
              type="text"
              required
              value={form.team}
              onChange={(e) => update("team", e.target.value)}
              placeholder="Real Madrid"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="name">Nombre del producto</label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Primera Equipación 25/26"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="category">Categoría</label>
            <select
              id="category"
              required
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="" disabled>
                Selecciona una categoría
              </option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            {categories.length === 0 ? (
              <p className="admin-help">
                Todavía no hay categorías. Crea una primero.
              </p>
            ) : null}
          </div>
          <div className="admin-field">
            <label htmlFor="league">Liga / competición</label>
            <input
              id="league"
              type="text"
              required
              list="leagues-list"
              value={form.league}
              onChange={(e) => update("league", e.target.value)}
              placeholder="LaLiga"
            />
            <datalist id="leagues-list">
              <option value="LaLiga" />
              <option value="Premier League" />
              <option value="Serie A" />
              <option value="Bundesliga" />
              <option value="Ligue 1" />
              <option value="Selecciones" />
              <option value="Retro" />
            </datalist>
          </div>
          <div className="admin-field">
            <label htmlFor="season">Temporada</label>
            <input
              id="season"
              type="text"
              required
              value={form.season}
              onChange={(e) => update("season", e.target.value)}
              placeholder="25/26"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="slug">URL (slug)</label>
            <input
              id="slug"
              type="text"
              value={slugTouched ? form.slug : suggestedSlug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", slugify(e.target.value));
              }}
              placeholder={suggestedSlug || "se-genera-automaticamente"}
            />
            <p className="admin-help">/producto/{slugTouched ? form.slug : suggestedSlug || "…"}</p>
          </div>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Precio y estado</p>
        <div className="admin-form__grid admin-form__grid--3">
          <div className="admin-field">
            <label htmlFor="price">Precio (€)</label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="compareAt">Precio anterior (€, oferta)</label>
            <input
              id="compareAt"
              type="number"
              step="0.01"
              min="0"
              value={form.compareAt}
              onChange={(e) => update("compareAt", e.target.value)}
              placeholder="Vacío = sin oferta"
            />
          </div>
          <div className="admin-field admin-field--checkbox">
            <input
              id="isNew"
              type="checkbox"
              checked={form.isNew}
              onChange={(e) => update("isNew", e.target.checked)}
            />
            <label htmlFor="isNew" style={{ marginBottom: 0 }}>
              Marcar como novedad
            </label>
          </div>
          <div className="admin-field">
            <label htmlFor="rating">Valoración (0–5)</label>
            <input
              id="rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={(e) => update("rating", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="reviews">Nº de reseñas</label>
            <input
              id="reviews"
              type="number"
              min="0"
              value={form.reviews}
              onChange={(e) => update("reviews", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Tallas y stock</p>
        <div>
          <p className="admin-help" style={{ marginBottom: 8 }}>
            Tallas disponibles en el catálogo
          </p>
          <div className="admin-checklist">
            {ALL_SIZES.map((size) => (
              <label
                key={size}
                className="admin-check"
                data-checked={form.sizes.includes(size) ? "true" : "false"}
              >
                <input
                  type="checkbox"
                  checked={form.sizes.includes(size)}
                  onChange={() => toggleInList("sizes", size)}
                />
                {size}
              </label>
            ))}
          </div>
        </div>
        {form.sizes.length > 0 ? (
          <div>
            <p className="admin-help" style={{ marginBottom: 8 }}>
              Tallas agotadas (opcional)
            </p>
            <div className="admin-checklist">
              {form.sizes.map((size) => (
                <label
                  key={size}
                  className="admin-check"
                  data-checked={form.soldOut.includes(size) ? "true" : "false"}
                >
                  <input
                    type="checkbox"
                    checked={form.soldOut.includes(size)}
                    onChange={() => toggleInList("soldOut", size)}
                  />
                  {size}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Diseño</p>
        <div className="admin-field">
          <label htmlFor="pattern">Patrón de la ilustración generada</label>
          <select
            id="pattern"
            value={form.pattern}
            onChange={(e) => update("pattern", e.target.value as Pattern)}
          >
            {PATTERNS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="admin-help">
            Se usa cuando el producto no tiene fotos reales subidas abajo.
          </p>
        </div>
        <div className="admin-color-row">
          <div className="admin-color">
            <input
              type="color"
              value={form.colorPrimary}
              onChange={(e) => update("colorPrimary", e.target.value)}
              aria-label="Color primario"
            />
            Primario
          </div>
          <div className="admin-color">
            <input
              type="color"
              value={form.colorSecondary}
              onChange={(e) => update("colorSecondary", e.target.value)}
              aria-label="Color secundario"
            />
            Secundario
          </div>
          <div className="admin-color">
            <input
              type="color"
              value={form.colorAccent}
              onChange={(e) => update("colorAccent", e.target.value)}
              aria-label="Color de acento"
            />
            Acento
          </div>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Fotos del producto</p>
        <ImageUploader
          images={form.images}
          onChange={(images) => update("images", images)}
          max={6}
        />
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Descripción y etiquetas</p>
        <div className="admin-field">
          <label htmlFor="description">Descripción</label>
          <textarea
            id="description"
            required
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Tejido, corte, detalles del diseño…"
          />
        </div>
        <div className="admin-field">
          <label htmlFor="tags">Etiquetas (separadas por comas)</label>
          <input
            id="tags"
            type="text"
            value={form.tags}
            onChange={(e) => update("tags", e.target.value)}
            placeholder="rojo, casa, liga"
          />
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/admin/productos")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting
            ? "Guardando…"
            : isEdit
              ? "Guardar cambios"
              : "Crear producto"}
        </button>
      </div>
    </form>
  );
}
