"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isOnSale, type Product } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductCard";

type Sort = "destacados" | "precio-asc" | "precio-desc" | "novedad";

const SORTS: [Sort, string][] = [
  ["destacados", "Destacados"],
  ["novedad", "Novedades primero"],
  ["precio-asc", "Precio: de menor a mayor"],
  ["precio-desc", "Precio: de mayor a menor"],
];

export function ProductBrowser({ products }: { products: Product[] }) {
  const [onlySale, setOnlySale] = useState(false);
  const [sort, setSort] = useState<Sort>("destacados");

  const visible = useMemo(() => {
    let list = products;
    if (onlySale) list = list.filter(isOnSale);

    const sorted = [...list];
    switch (sort) {
      case "precio-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "precio-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "novedad":
        sorted.sort((a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false));
        break;
      default:
        sorted.sort((a, b) => b.reviews - a.reviews);
    }
    return sorted;
  }, [products, onlySale, sort]);

  return (
    <>
      <div className="toolbar">
        <div className="filters">
          <button
            type="button"
            className="filter"
            data-active={onlySale ? "true" : "false"}
            onClick={() => setOnlySale((v) => !v)}
          >
            Sólo ofertas
          </button>
        </div>

        <div className="row gap-4">
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
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <h3 className="h2">No hay artículos con estos filtros</h3>
          <p className="meta">Prueba a quitar algún filtro o vuelve al inicio.</p>
          <Link href="/" className="btn btn--ghost btn--sm">
            Volver al inicio
          </Link>
        </div>
      ) : (
        <ProductGrid products={visible} />
      )}
    </>
  );
}
