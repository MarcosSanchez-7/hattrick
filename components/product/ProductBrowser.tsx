"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product, Tag } from "@/lib/catalog";
import { formatNumber } from "@/lib/format";
import { ProductGrid } from "@/components/product/ProductCard";
import { IconClose } from "@/components/ui/Icons";

type Sort = "destacados" | "precio-asc" | "precio-desc" | "novedad";

const SORTS: [Sort, string][] = [
  ["destacados", "Destacados"],
  ["novedad", "Novedades primero"],
  ["precio-asc", "Precio: de menor a mayor"],
  ["precio-desc", "Precio: de mayor a menor"],
];

export type CategoryLink = { name: string; href: string; active?: boolean };

export function ProductBrowser({
  products,
  tags = [],
  defaultSort = "destacados",
  categoryLinks = [],
}: {
  products: Product[];
  tags?: Tag[];
  /** Ej. "novedad" en /novedades: arranca ordenado por fecha de alta sin
   * que el cliente tenga que tocar el selector. */
  defaultSort?: Sort;
  /** Subcategorías de la categoría actual (antes vivían como chips arriba
   * del listado, en app/(store)/categoria/[...slug]/page.tsx) -- ahora se
   * renderizan dentro del panel de filtros, junto con talla/precio/equipo. */
  categoryLinks?: CategoryLink[];
}) {
  const [sort, setSort] = useState<Sort>(defaultSort);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activeSizes, setActiveSizes] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Solo etiquetas marcadas "usar como filtro" (ej. ligas) Y que de verdad
  // tiene algún producto de esta lista -- evita, ej., mostrar el chip "Serie
  // A" en una categoría donde no hay ningún producto italiano.
  const filterTags = useMemo(
    () =>
      tags.filter(
        (t) => t.isFilter && products.some((p) => p.tags.includes(t.name)),
      ),
    [tags, products],
  );

  const sizeOptions = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.sizes))).sort(),
    [products],
  );

  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const prices = products.map((p) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [products]);

  const toggleFilter = (name: string) => {
    setActiveFilters((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name],
    );
  };

  const toggleSize = (size: string) => {
    setActiveSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const hasActiveFilters =
    activeFilters.length > 0 ||
    activeSizes.length > 0 ||
    priceMin.trim() !== "" ||
    priceMax.trim() !== "";

  const clearAllFilters = () => {
    setActiveFilters([]);
    setActiveSizes([]);
    setPriceMin("");
    setPriceMax("");
  };

  const filtered = useMemo(() => {
    const min = priceMin.trim() !== "" ? Number(priceMin) : null;
    const max = priceMax.trim() !== "" ? Number(priceMax) : null;
    return products.filter((p) => {
      // Tags: OR entre sí (cualquier liga marcada sirve); el resultado se
      // combina con AND contra talla y precio (facetas distintas).
      if (activeFilters.length > 0 && !p.tags.some((t) => activeFilters.includes(t))) {
        return false;
      }
      if (activeSizes.length > 0 && !p.sizes.some((s) => activeSizes.includes(s))) {
        return false;
      }
      if (min != null && Number.isFinite(min) && p.price < min) return false;
      if (max != null && Number.isFinite(max) && p.price > max) return false;
      return true;
    });
  }, [products, activeFilters, activeSizes, priceMin, priceMax]);

  const visible = useMemo(() => {
    const sorted = [...filtered];
    switch (sort) {
      case "precio-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "precio-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "novedad":
        // Más reciente primero (fecha de alta), no solo "es nuevo sí/no"
        // — antes ordenaba por el booleano isNew, que entre productos que
        // ya son todos isNew (ej. /novedades) no cambiaba nada el orden.
        sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        break;
      default:
        sorted.sort((a, b) => b.reviews - a.reviews);
    }
    return sorted;
  }, [filtered, sort]);

  useEffect(() => {
    if (!sheetOpen) return;
    document.body.dataset.scrollLocked = "true";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.dataset.scrollLocked = "false";
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const hasSidebar =
    categoryLinks.length > 0 ||
    filterTags.length > 0 ||
    sizeOptions.length > 1 ||
    priceBounds.max > priceBounds.min;

  const filterPanel = (
    <>
      {categoryLinks.length > 0 ? (
        <div className="browse__group">
          <p className="label browse__group-title">Categoría</p>
          <div className="browse__links">
            {categoryLinks.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="browse__link"
                data-active={c.active ? "true" : "false"}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {filterTags.length > 0 ? (
        <div className="browse__group">
          <p className="label browse__group-title">Equipo / Liga</p>
          <div className="filters">
            {filterTags.map((tag) => (
              <button
                key={tag.name}
                type="button"
                className="filter"
                data-active={activeFilters.includes(tag.name) ? "true" : "false"}
                onClick={() => toggleFilter(tag.name)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sizeOptions.length > 1 ? (
        <div className="browse__group">
          <p className="label browse__group-title">Talla</p>
          <div className="sizes">
            {sizeOptions.map((s) => (
              <button
                key={s}
                type="button"
                className="size"
                data-selected={activeSizes.includes(s) ? "true" : "false"}
                onClick={() => toggleSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {priceBounds.max > priceBounds.min ? (
        <div className="browse__group">
          <p className="label browse__group-title">Precio</p>
          <div className="field-group browse__price">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={formatNumber(priceBounds.min)}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              aria-label="Precio mínimo"
            />
            <span className="meta" aria-hidden="true">—</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={formatNumber(priceBounds.max)}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              aria-label="Precio máximo"
            />
          </div>
        </div>
      ) : null}

      {hasActiveFilters ? (
        <button type="button" className="link-underline meta" onClick={clearAllFilters}>
          Quitar filtros
        </button>
      ) : null}
    </>
  );

  const grid =
    visible.length === 0 ? (
      <div className="empty-state">
        <h3 className="h2">No hay artículos con estos filtros</h3>
        <p className="meta">Prueba a quitar algún filtro o vuelve al inicio.</p>
        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearAllFilters}>
            Quitar filtros
          </button>
        ) : (
          <Link href="/" className="btn btn--ghost btn--sm">
            Volver al inicio
          </Link>
        )}
      </div>
    ) : (
      <ProductGrid products={visible} tags={tags} />
    );

  if (!hasSidebar) {
    return (
      <>
        <div className="toolbar toolbar--simple">
          <span className="meta">{visible.length} artículos</span>
          <label className="sr-only" htmlFor="sort">
            Ordenar por
          </label>
          <select
            id="sort"
            className="select"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {grid}
      </>
    );
  }

  return (
    <div className="browse">
      <aside className="browse__sidebar">{filterPanel}</aside>

      <div className="browse__main">
        <div className="toolbar toolbar--simple">
          <span className="meta">{visible.length} artículos</span>
          <div className="row gap-2">
            <button
              type="button"
              className="btn btn--ghost btn--sm browse__filter-trigger"
              onClick={() => setSheetOpen(true)}
            >
              Filtrar
            </button>
            <label className="sr-only" htmlFor="sort">
              Ordenar por
            </label>
            <select
              id="sort"
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              {SORTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {grid}
      </div>

      {sheetOpen ? (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Filtros">
          <button
            className="drawer__scrim"
            onClick={() => setSheetOpen(false)}
            aria-label="Cerrar filtros"
            tabIndex={-1}
          />
          <div className="drawer__panel">
            <div className="drawer__head">
              <p className="label">Filtros</p>
              <button
                type="button"
                className="nav__icon-btn"
                onClick={() => setSheetOpen(false)}
                aria-label="Cerrar filtros"
              >
                <IconClose />
              </button>
            </div>
            <div className="drawer__body">{filterPanel}</div>
            <div className="drawer__foot">
              <button type="button" className="btn btn--sm" onClick={() => setSheetOpen(false)}>
                Ver {visible.length} artículo{visible.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
