"use client";

import { useMemo, useState } from "react";
import type { Category, Product } from "@/lib/catalog";
import { IconChevron, IconFolder } from "@/components/ui/Icons";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";

const LOW_STOCK_THRESHOLD = 3;

type VariantRow = {
  variantId: string;
  productName: string;
  category: string;
  size: string;
  stock: number;
};

function toRows(products: Product[]): VariantRow[] {
  const rows: VariantRow[] = [];
  for (const p of products) {
    if (p.stockMode !== "propio") continue;
    for (const v of p.variants ?? []) {
      rows.push({
        variantId: v.id,
        productName: p.name,
        category: p.category,
        size: v.size,
        stock: v.stock,
      });
    }
  }
  return rows;
}

export function InventoryTable({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  // Arranca vacío a propósito: ninguna carpeta expandida = todas cerradas
  // hasta que el admin haga click (mismo patrón que ProductsTable).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [adjusting, setAdjusting] = useState<VariantRow | null>(null);

  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug;

  const allRows = useMemo(() => toRows(products), [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) =>
      [r.productName, categoryName(r.category)].join(" ").toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, query, categories]);

  const isSearching = query.trim() !== "";

  const groups = useMemo(() => {
    const bySlug = new Map<string, VariantRow[]>();
    for (const r of filtered) {
      const list = bySlug.get(r.category) ?? [];
      list.push(r);
      bySlug.set(r.category, list);
    }
    const ordered: { slug: string; name: string; items: VariantRow[] }[] = [];
    for (const c of categories) {
      const items = bySlug.get(c.slug);
      if (items?.length) ordered.push({ slug: c.slug, name: c.name, items });
    }
    return ordered;
  }, [filtered, categories]);

  const toggleExpanded = (slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          {allRows.length} talla{allRows.length !== 1 ? "s" : ""} de stock propio
        </p>
        <input
          type="search"
          className="admin-search"
          placeholder="Buscar por producto o categoría…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar en inventario"
        />
      </div>

      {allRows.length === 0 ? (
        <div className="admin-empty">
          Todavía no hay productos de stock propio con tallas cargadas.
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">Ningún producto coincide con la búsqueda.</div>
      ) : isSearching ? (
        <InventoryRowsTable rows={filtered} onAdjust={setAdjusting} />
      ) : (
        groups.map((group) => {
          const isExpanded = expanded.has(group.slug);
          return (
            <div key={group.slug} className="admin-cat-group">
              <button
                type="button"
                className="admin-cat-group__head"
                aria-expanded={isExpanded}
                onClick={() => toggleExpanded(group.slug)}
              >
                <IconFolder className="icon--sm" />
                <span>{group.name}</span>
                <span className="meta">
                  {group.items.length} talla{group.items.length !== 1 ? "s" : ""}
                </span>
                <IconChevron className="icon--sm" />
              </button>
              {isExpanded ? (
                <InventoryRowsTable rows={group.items} onAdjust={setAdjusting} />
              ) : null}
            </div>
          );
        })
      )}

      {adjusting ? (
        <StockAdjustForm
          variantId={adjusting.variantId}
          productName={adjusting.productName}
          size={adjusting.size}
          currentStock={adjusting.stock}
          onClose={() => setAdjusting(null)}
        />
      ) : null}
    </div>
  );
}

function InventoryRowsTable({
  rows,
  onAdjust,
}: {
  rows: VariantRow[];
  onAdjust: (row: VariantRow) => void;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Talla</th>
            <th>Stock</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.variantId}>
              <td style={{ fontWeight: 600 }}>{r.productName}</td>
              <td data-label="Talla">{r.size}</td>
              <td data-label="Stock">
                {r.stock}
                {r.stock === 0 ? (
                  <span className="badge badge--out" style={{ marginLeft: 6 }}>
                    Agotado
                  </span>
                ) : r.stock <= LOW_STOCK_THRESHOLD ? (
                  <span className="badge badge--out" style={{ marginLeft: 6 }}>
                    Stock bajo
                  </span>
                ) : null}
              </td>
              <td>
                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ height: 32, paddingInline: 12 }}
                    onClick={() => onAdjust(r)}
                  >
                    Ajustar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
