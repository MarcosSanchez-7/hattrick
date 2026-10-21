"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product, Tag } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductCard";

type Sort = "destacados" | "precio-asc" | "precio-desc" | "novedad";

const SORTS: [Sort, string][] = [
  ["destacados", "Destacados"],
  ["novedad", "Novedades primero"],
  ["precio-asc", "Precio: de menor a mayor"],
  ["precio-desc", "Precio: de mayor a menor"],
];

export function ProductBrowser({
  products,
  tags = [],
  defaultSort = "destacados",
}: {
  products: Product[];
  tags?: Tag[];
  /** Ej. "novedad" en /novedades: arranca ordenado por fecha de alta sin
   * que el cliente tenga que tocar el selector. */
  defaultSort?: Sort;
}) {
  const [sort, setSort] = useState<Sort>(defaultSort);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

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

  const toggleFilter = (name: string) => {
    setActiveFilters((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name],
    );
  };

  const filtered = useMemo(() => {
    if (activeFilters.length === 0) return products;
    return products.filter((p) => p.tags.some((t) => activeFilters.includes(t)));
  }, [products, activeFilters]);

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

  return (
    <>
      {filterTags.length > 0 ? (
        <div className="filters" style={{ marginBottom: "var(--sp-4)" }}>
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
      ) : null}

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

      {visible.length === 0 ? (
        <div className="empty-state">
          <h3 className="h2">No hay artículos con estos filtros</h3>
          <p className="meta">Prueba a quitar algún filtro o vuelve al inicio.</p>
          {activeFilters.length > 0 ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setActiveFilters([])}
            >
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
      )}
    </>
  );
}
