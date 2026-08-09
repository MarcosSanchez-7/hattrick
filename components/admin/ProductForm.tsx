"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SIZES_ADULT,
  type Category,
  type Pattern,
  type Product,
  type StockMode,
} from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import { ImageUploader } from "@/components/admin/ImageUploader";

const STOCK_MODES: { value: StockMode; label: string; help: string }[] = [
  {
    value: "propio",
    label: "Stock propio",
    help: "Cargamos cantidad real por talla; la web la descuenta sola.",
  },
  {
    value: "ajeno",
    label: "Stock ajeno",
    help: "No llevamos cantidad. La ficha muestra \"Consultar talle\".",
  },
  {
    value: "importado",
    label: "Importado",
    help: "No llevamos cantidad. La ficha muestra \"Consultar talle\".",
  },
];

type FormState = {
  team: string;
  name: string;
  category: string;
  league: string;
  season: string;
  price: string;
  compareAt: string;
  costPrice: string;
  isNew: boolean;
  isVisible: boolean;
  rating: string;
  reviews: string;
  stockMode: StockMode;
  /** Talla -> cantidad (como texto, para no pelear con inputs controlados). */
  variantQuantities: Record<string, string>;
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
  const variantQuantities: Record<string, string> = {};
  for (const v of product?.variants ?? []) {
    variantQuantities[v.size] = String(v.stock);
  }

  return {
    team: product?.team ?? "",
    name: product?.name ?? "",
    category: product?.category ?? "",
    league: product?.league ?? "",
    season: product?.season ?? "25/26",
    price: product ? String(product.price) : "",
    compareAt: product?.compareAt != null ? String(product.compareAt) : "",
    costPrice: product?.costPrice != null ? String(product.costPrice) : "",
    isNew: product?.isNew ?? false,
    isVisible: product?.isVisible ?? true,
    rating: product ? String(product.rating) : "5",
    reviews: product ? String(product.reviews) : "0",
    stockMode: product?.stockMode ?? "propio",
    variantQuantities,
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

  const toggleSize = (size: string) => {
    setForm((f) => {
      const next = { ...f.variantQuantities };
      if (size in next) {
        delete next[size];
      } else {
        next[size] = "0";
      }
      return { ...f, variantQuantities: next };
    });
  };

  const setSizeQuantity = (size: string, value: string) => {
    setForm((f) => ({
      ...f,
      variantQuantities: { ...f.variantQuantities, [size]: value },
    }));
  };

  const isPropio = form.stockMode === "propio";

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
    if (isPropio && Object.keys(form.variantQuantities).length === 0) {
      setError("Selecciona al menos una talla y su cantidad.");
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
      costPrice: form.costPrice.trim() ? Number(form.costPrice) : null,
      isNew: form.isNew,
      isVisible: form.isVisible,
      rating: Number(form.rating) || 5,
      reviews: Number(form.reviews) || 0,
      stockMode: form.stockMode,
      variantQuantities: isPropio
        ? Object.fromEntries(
            Object.entries(form.variantQuantities).map(([size, qty]) => [
              size,
              Math.max(0, Math.round(Number(qty) || 0)),
            ]),
          )
        : undefined,
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
            <label htmlFor="price">Precio (Gs.)</label>
            <input
              id="price"
              type="number"
              step="1000"
              min="0"
              required
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="compareAt">Precio anterior (Gs., oferta)</label>
            <input
              id="compareAt"
              type="number"
              step="1000"
              min="0"
              value={form.compareAt}
              onChange={(e) => update("compareAt", e.target.value)}
              placeholder="Vacío = sin oferta"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="costPrice">Precio de costo (Gs., opcional)</label>
            <input
              id="costPrice"
              type="number"
              step="1000"
              min="0"
              value={form.costPrice}
              onChange={(e) => update("costPrice", e.target.value)}
              placeholder="Para calcular ganancia en Ventas"
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
          <div className="admin-field admin-field--checkbox">
            <input
              id="isVisible"
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) => update("isVisible", e.target.checked)}
            />
            <label htmlFor="isVisible" style={{ marginBottom: 0 }}>
              Visible en la tienda
            </label>
          </div>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Tipo de stock</p>
        <div className="admin-checklist">
          {STOCK_MODES.map(({ value, label }) => (
            <label
              key={value}
              className="admin-check"
              data-checked={form.stockMode === value ? "true" : "false"}
            >
              <input
                type="radio"
                name="stockMode"
                checked={form.stockMode === value}
                onChange={() => update("stockMode", value)}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="admin-help">
          {STOCK_MODES.find((m) => m.value === form.stockMode)?.help}
        </p>

        {isPropio ? (
          <div className="admin-variant-list">
            {SIZES_ADULT.map((size) => {
              const included = size in form.variantQuantities;
              return (
                <div key={size} className="admin-variant-row">
                  <label
                    className="admin-check"
                    data-checked={included ? "true" : "false"}
                  >
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() => toggleSize(size)}
                    />
                    {size}
                  </label>
                  {included ? (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="admin-variant-qty"
                      value={form.variantQuantities[size]}
                      onChange={(e) => setSizeQuantity(size, e.target.value)}
                      aria-label={`Cantidad en stock, talla ${size}`}
                      placeholder="Cantidad"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="admin-notice-ok">
            Este producto mostrará &quot;Consultar talle&quot; en la tienda en vez
            de un selector de talla con stock.
          </p>
        )}
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
