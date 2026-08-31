"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SIZES_ADULT,
  type Category,
  type Patch,
  type Pattern,
  type Product,
  type StockMode,
  type Tag,
} from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import { formatPrice } from "@/lib/format";
import { imageVariant } from "@/lib/image";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { CategoryPathPicker } from "@/components/admin/CategoryPathPicker";
import { TagPicker } from "@/components/admin/TagPicker";
import { IconChevron, IconFolder } from "@/components/ui/Icons";

const NO_PATCH_CATEGORY = "Sin categoría";

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
  name: string;
  category: string;
  /** Precio normal del producto. */
  regularPrice: string;
  /** Precio de oferta, vacío = sin oferta. Debe ser menor al precio normal. */
  offerPrice: string;
  costPrice: string;
  /** Precio al que se le vende al vendedor para revender — es lo único de precio que ve su usuario en Inventario. */
  wholesalePrice: string;
  isNew: boolean;
  isVisible: boolean;
  /** Habilita la casilla "Personalizado" (nombre y número) en la ficha pública. */
  isCustomizable: boolean;
  /** Ids de los parches que se le pueden poner a este producto. */
  patchIds: string[];
  rating: string;
  reviews: string;
  stockMode: StockMode;
  /** Carga cantidad real por talla aunque stockMode no sea "propio" — solo
   * para uso interno, la ficha pública sigue mostrando "Consultar talle". */
  internalControl: boolean;
  /** Talla -> cantidad (como texto, para no pelear con inputs controlados). */
  variantQuantities: Record<string, string>;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  pattern: Pattern;
  description: string;
  tags: string[];
  images: string[];
  slug: string;
};

function toFormState(product?: Product): FormState {
  const variantQuantities: Record<string, string> = {};
  for (const v of product?.variants ?? []) {
    variantQuantities[v.size] = String(v.stock);
  }

  // El precio "normal" es siempre el más alto de los dos si hay oferta —
  // acá se invierte la relación price/compareAt guardada para que el admin
  // piense "precio normal" + "precio oferta (opcional, más barato)".
  const onSale = product?.compareAt != null;

  return {
    name: product?.name ?? "",
    category: product?.category ?? "",
    regularPrice: product ? String(onSale ? product.compareAt : product.price) : "",
    offerPrice: onSale ? String(product!.price) : "",
    costPrice: product?.costPrice != null ? String(product.costPrice) : "",
    wholesalePrice: product?.wholesalePrice != null ? String(product.wholesalePrice) : "",
    isNew: product?.isNew ?? false,
    isVisible: product?.isVisible ?? true,
    isCustomizable: product?.isCustomizable ?? false,
    patchIds: product?.patches?.map((p) => p.id) ?? [],
    rating: product ? String(product.rating) : "5",
    reviews: product ? String(product.reviews) : "0",
    stockMode: product?.stockMode ?? "propio",
    internalControl: product?.internalControl ?? false,
    variantQuantities,
    colorPrimary: product?.colors.primary ?? "#111111",
    colorSecondary: product?.colors.secondary ?? "#f2f2f2",
    colorAccent: product?.colors.accent ?? "#d4af37",
    pattern: product?.pattern ?? "solid",
    description: product?.description ?? "",
    tags: product?.tags ?? [],
    images: product?.images ?? [],
    slug: product?.slug ?? "",
  };
}

export function ProductForm({
  categories,
  tags,
  patches,
  product,
}: {
  categories: Category[];
  tags: Tag[];
  patches: Patch[];
  product?: Product;
}) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [form, setForm] = useState<FormState>(() => toFormState(product));
  const [tagsCatalog, setTagsCatalog] = useState(tags);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedSlug = useMemo(() => slugify(form.name), [form.name]);

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

  const togglePatch = (patchId: string) => {
    setForm((f) => ({
      ...f,
      patchIds: f.patchIds.includes(patchId)
        ? f.patchIds.filter((id) => id !== patchId)
        : [...f.patchIds, patchId],
    }));
  };

  // Carpetas por categoría — mismo patrón que InventoryTable.tsx agrupa
  // productos por categoría, pero acá la "categoría" es el campo libre
  // Patch.category en vez de la categoría del catálogo.
  const patchGroups = useMemo(() => {
    const byCategory = new Map<string, Patch[]>();
    for (const p of patches) {
      const key = p.category ?? NO_PATCH_CATEGORY;
      const list = byCategory.get(key) ?? [];
      list.push(p);
      byCategory.set(key, list);
    }
    const entries = Array.from(byCategory.entries());
    entries.sort(([a], [b]) => {
      if (a === NO_PATCH_CATEGORY) return 1;
      if (b === NO_PATCH_CATEGORY) return -1;
      return a.localeCompare(b);
    });
    return entries.map(([name, items]) => ({ name, items }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patches]);

  const [openPatchCategories, setOpenPatchCategories] = useState<Set<string>>(
    () =>
      new Set(
        patchGroups
          .filter((g) => g.items.some((p) => form.patchIds.includes(p.id)))
          .map((g) => g.name),
      ),
  );

  const togglePatchCategory = (name: string) => {
    setOpenPatchCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const isPropio = form.stockMode === "propio";
  // Con Control interno activado se carga/edita cantidad por talla aunque
  // el stock sea ajeno/importado — pero solo para uso interno.
  const showVariantEditor = isPropio || form.internalControl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const regularPrice = Number(form.regularPrice);
    const offerPrice = form.offerPrice.trim() ? Number(form.offerPrice) : null;

    if (!form.category) {
      setError("Selecciona una categoría.");
      return;
    }
    if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
      setError("Introduce un precio válido.");
      return;
    }
    if (offerPrice != null && (!Number.isFinite(offerPrice) || offerPrice <= 0)) {
      setError("El precio oferta no es válido.");
      return;
    }
    if (offerPrice != null && offerPrice >= regularPrice) {
      setError("El precio oferta debe ser menor al precio normal.");
      return;
    }
    if (isPropio && Object.keys(form.variantQuantities).length === 0) {
      setError("Selecciona al menos una talla y su cantidad.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      price: offerPrice ?? regularPrice,
      compareAt: offerPrice != null ? regularPrice : null,
      costPrice: form.costPrice.trim() ? Number(form.costPrice) : null,
      wholesalePrice: form.wholesalePrice.trim() ? Number(form.wholesalePrice) : null,
      isNew: form.isNew,
      isVisible: form.isVisible,
      isCustomizable: form.isCustomizable,
      patchIds: form.patchIds,
      rating: Number(form.rating) || 5,
      reviews: Number(form.reviews) || 0,
      stockMode: form.stockMode,
      internalControl: form.internalControl,
      variantQuantities: showVariantEditor
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
      tags: form.tags,
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
      router.push("/gestion-ssjblue/inventario");
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
            <label htmlFor="name">Nombre del producto</label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Real Madrid — Primera Equipación 25/26"
            />
          </div>
          <div className="admin-field">
            <label>Categoría</label>
            <CategoryPathPicker
              categories={categories}
              value={form.category}
              onChange={(slug) => update("category", slug)}
            />
            {categories.length === 0 ? (
              <p className="admin-help">
                Todavía no hay categorías. Crea una primero.
              </p>
            ) : null}
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
            <label htmlFor="regularPrice">Precio (Gs.)</label>
            <input
              id="regularPrice"
              type="number"
              step="1000"
              min="0"
              required
              value={form.regularPrice}
              onChange={(e) => update("regularPrice", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="offerPrice">Precio oferta (Gs.)</label>
            <input
              id="offerPrice"
              type="number"
              step="1000"
              min="0"
              value={form.offerPrice}
              onChange={(e) => update("offerPrice", e.target.value)}
              placeholder="Vacío = sin oferta"
            />
            <p className="admin-help">Debe ser menor al precio normal.</p>
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
          <div className="admin-field">
            <label htmlFor="wholesalePrice">Precio mayorista (Gs., opcional)</label>
            <input
              id="wholesalePrice"
              type="number"
              step="1000"
              min="0"
              value={form.wholesalePrice}
              onChange={(e) => update("wholesalePrice", e.target.value)}
              placeholder="Lo que le vendemos al vendedor para revender"
            />
            <p className="admin-help">
              Es el único precio que ve el usuario con rol Vendedor en Inventario.
            </p>
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
          <div className="admin-field admin-field--checkbox">
            <input
              id="isCustomizable"
              type="checkbox"
              checked={form.isCustomizable}
              onChange={(e) => update("isCustomizable", e.target.checked)}
            />
            <label htmlFor="isCustomizable" style={{ marginBottom: 0 }}>
              Admite personalización (nombre y número)
            </label>
          </div>
        </div>
        {form.isCustomizable ? (
          <p className="admin-help">
            El precio de personalización es único para todo el catálogo — se
            configura en Generales → Banner de personalización.
          </p>
        ) : null}
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

        <div className="admin-field admin-field--checkbox">
          <input
            id="internalControl"
            type="checkbox"
            checked={form.internalControl}
            onChange={(e) => update("internalControl", e.target.checked)}
          />
          <label htmlFor="internalControl" style={{ marginBottom: 0 }}>
            Control interno de stock
          </label>
        </div>
        <p className="admin-help">
          Cargá cuántas unidades tenés de cada talla para tu propio control,
          sin importar el tipo de stock elegido arriba. La ficha pública NO
          muestra esta cantidad — el cliente sigue viendo &quot;Consultar
          talle&quot; igual que siempre.
        </p>

        {showVariantEditor ? (
          <>
            {!isPropio ? (
              <p className="admin-notice-ok">
                Esta cantidad es solo para tu control interno — la ficha
                pública sigue mostrando &quot;Consultar talle&quot;, el cliente no
                la ve ni queda limitado por ella.
              </p>
            ) : null}
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
          </>
        ) : (
          <p className="admin-notice-ok">
            Este producto mostrará &quot;Consultar talle&quot; en la tienda en vez
            de un selector de talla con stock.
          </p>
        )}
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Parches disponibles</p>
        {patches.length === 0 ? (
          <p className="admin-help">
            Todavía no cargaste ningún parche — se crean desde Generales →
            Parches.
          </p>
        ) : (
          <>
            <p className="admin-help" style={{ marginTop: 0 }}>
              Desplegá una carpeta y marcá cuáles de esos parches se le pueden
              poner a este producto.
            </p>
            {patchGroups.map((group) => {
              const visibleItems = group.items.filter(
                (p) => p.isVisible || form.patchIds.includes(p.id),
              );
              if (visibleItems.length === 0) return null;
              const selectedCount = visibleItems.filter((p) =>
                form.patchIds.includes(p.id),
              ).length;
              const isOpen = openPatchCategories.has(group.name);
              return (
                <div key={group.name} className="admin-cat-group">
                  <button
                    type="button"
                    className="admin-cat-group__head"
                    aria-expanded={isOpen}
                    onClick={() => togglePatchCategory(group.name)}
                  >
                    <IconFolder className="icon--sm" />
                    <span>{group.name}</span>
                    <span className="meta">
                      {selectedCount > 0
                        ? `${selectedCount} seleccionado${selectedCount !== 1 ? "s" : ""}`
                        : `${visibleItems.length} parche${visibleItems.length !== 1 ? "s" : ""}`}
                    </span>
                    <IconChevron className="icon--sm" />
                  </button>
                  {isOpen ? (
                    <div className="admin-checklist" style={{ padding: "0 var(--sp-5) var(--sp-4)" }}>
                      {visibleItems.map((p) => (
                        <label
                          key={p.id}
                          className="admin-check"
                          data-checked={form.patchIds.includes(p.id) ? "true" : "false"}
                        >
                          <input
                            type="checkbox"
                            checked={form.patchIds.includes(p.id)}
                            onChange={() => togglePatch(p.id)}
                          />
                          {p.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageVariant(p.images[0], "thumb")}
                              alt=""
                              style={{ width: 20, height: 20, objectFit: "contain", marginRight: 4 }}
                              loading="lazy"
                            />
                          ) : null}
                          {p.name} · {formatPrice(p.price)}
                          {p.stock === 0 ? (
                            <span className="meta"> · sin stock</span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Fotos del producto</p>
        <ImageUploader
          images={form.images}
          onChange={(images) => update("images", images)}
          max={6}
          folder={form.category || undefined}
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
          <label>Etiquetas</label>
          <TagPicker
            catalog={tagsCatalog}
            value={form.tags}
            onChange={(next) => update("tags", next)}
            onCatalogChange={setTagsCatalog}
          />
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/inventario")}
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
