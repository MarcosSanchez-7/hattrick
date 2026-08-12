"use client";

import { useMemo, useState } from "react";
import type { Category, Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { IconChevron, IconFolder } from "@/components/ui/Icons";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";

const LOW_STOCK_THRESHOLD = 3;

type ProductStockRow = {
  productId: string;
  productName: string;
  category: string;
  costPrice: number | null;
  variants: { variantId: string; size: string; stock: number }[];
};

type Adjusting = {
  variantId: string;
  productName: string;
  size: string;
  stock: number;
};

function toRows(products: Product[]): ProductStockRow[] {
  const rows: ProductStockRow[] = [];
  for (const p of products) {
    if (p.stockMode !== "propio" || !p.variants?.length) continue;
    rows.push({
      productId: p.id,
      productName: p.name,
      category: p.category,
      costPrice: p.costPrice ?? null,
      variants: p.variants.map((v) => ({ variantId: v.id, size: v.size, stock: v.stock })),
    });
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
  const [adjusting, setAdjusting] = useState<Adjusting | null>(null);

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
    const bySlug = new Map<string, ProductStockRow[]>();
    for (const r of filtered) {
      const list = bySlug.get(r.category) ?? [];
      list.push(r);
      bySlug.set(r.category, list);
    }
    const ordered: { slug: string; name: string; items: ProductStockRow[] }[] = [];
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
          {allRows.length} producto{allRows.length !== 1 ? "s" : ""} de stock propio
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
      ) : (
        <>
          <p className="admin-help" style={{ padding: "0 var(--sp-5)", marginTop: 0 }}>
            Tocá una talla para reponer o corregir su stock. Ámbar = stock
            bajo (≤ {LOW_STOCK_THRESHOLD}), rojo = agotado.
          </p>
          {isSearching ? (
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
                      {group.items.length} producto{group.items.length !== 1 ? "s" : ""}
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
        </>
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
  rows: ProductStockRow[];
  onAdjust: (a: Adjusting) => void;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Tallas</th>
            <th>Stock total</th>
            <th>Invertido</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const totalStock = r.variants.reduce((acc, v) => acc + v.stock, 0);
            const invested = r.costPrice != null ? r.costPrice * totalStock : null;
            return (
              <tr key={r.productId}>
                <td style={{ fontWeight: 600 }}>{r.productName}</td>
                <td data-label="Tallas">
                  <div className="inventory-sizes">
                    {r.variants.map((v) => (
                      <button
                        key={v.variantId}
                        type="button"
                        className={
                          "inventory-size-chip" +
                          (v.stock === 0
                            ? " inventory-size-chip--out"
                            : v.stock <= LOW_STOCK_THRESHOLD
                              ? " inventory-size-chip--low"
                              : "")
                        }
                        title={`Ajustar stock de la talla ${v.size}`}
                        onClick={() =>
                          onAdjust({
                            variantId: v.variantId,
                            productName: r.productName,
                            size: v.size,
                            stock: v.stock,
                          })
                        }
                      >
                        {v.size} {v.stock}
                      </button>
                    ))}
                  </div>
                </td>
                <td data-label="Stock total" style={{ fontWeight: 600 }}>
                  {totalStock}
                </td>
                <td data-label="Invertido">
                  {invested != null ? formatPrice(invested) : <span className="meta">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
