"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { discountPercent, isOnSale, isSoldOut, type Category, type Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { ProductVisual } from "@/components/product/ProductVisual";
import {
  IconChevron,
  IconExternal,
  IconEye,
  IconEyeOff,
  IconFolder,
  IconTrash,
} from "@/components/ui/Icons";
import { StockAdjustForm } from "@/components/admin/StockAdjustForm";

const LOW_STOCK_THRESHOLD = 3;

const totalStock = (p: Product) =>
  p.variants?.reduce((acc, v) => acc + v.stock, 0) ?? 0;

type Adjusting = {
  variantId: string;
  productName: string;
  size: string;
  stock: number;
};

type RowActions = {
  pendingId: string | null;
  togglingId: string | null;
  onDelete: (product: Product) => void;
  onToggleVisibility: (product: Product) => void;
};

export function InventoryTable({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Arranca vacío a propósito: ninguna carpeta expandida = todas cerradas
  // hasta que el admin haga click.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedStock, setExpandedStock] = useState<Set<string>>(new Set());
  const [adjusting, setAdjusting] = useState<Adjusting | null>(null);

  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, categoryName(p.category)].join(" ").toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, query, categories]);

  const isSearching = query.trim() !== "";

  const groups = useMemo(() => {
    const bySlug = new Map<string, Product[]>();
    for (const p of filtered) {
      const list = bySlug.get(p.category) ?? [];
      list.push(p);
      bySlug.set(p.category, list);
    }
    const ordered: { slug: string; name: string; items: Product[] }[] = [];
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

  const toggleStock = (id: string) => {
    setExpandedStock((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`¿Eliminar «${product.name}»?`)) return;
    setPendingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar el producto.");
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setPendingId(null);
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    setTogglingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !product.isVisible }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo cambiar la visibilidad.");
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setTogglingId(null);
    }
  };

  const actions: RowActions = {
    pendingId,
    togglingId,
    onDelete: handleDelete,
    onToggleVisibility: handleToggleVisibility,
  };

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          {products.length} producto{products.length !== 1 ? "s" : ""}
        </p>
        <input
          type="search"
          className="admin-search"
          placeholder="Buscar por nombre o categoría…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar productos"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          {products.length === 0
            ? "Todavía no has añadido ningún producto."
            : "Ningún producto coincide con la búsqueda."}
        </div>
      ) : isSearching ? (
        <ProductRowsTable
          products={filtered}
          categoryName={categoryName}
          actions={actions}
          expandedStock={expandedStock}
          onToggleStock={toggleStock}
          onAdjust={setAdjusting}
        />
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
                <ProductRowsTable
                  products={group.items}
                  categoryName={categoryName}
                  actions={actions}
                  hideCategoryColumn
                  expandedStock={expandedStock}
                  onToggleStock={toggleStock}
                  onAdjust={setAdjusting}
                />
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

function ProductRowsTable({
  products,
  categoryName,
  actions,
  hideCategoryColumn,
  expandedStock,
  onToggleStock,
  onAdjust,
}: {
  products: Product[];
  categoryName: (slug: string) => string;
  actions: RowActions;
  hideCategoryColumn?: boolean;
  expandedStock: Set<string>;
  onToggleStock: (id: string) => void;
  onAdjust: (a: Adjusting) => void;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Producto</th>
            {hideCategoryColumn ? null : <th>Categoría</th>}
            <th>Precio</th>
            <th>Estado</th>
            <th>Stock</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const isStockOpen = expandedStock.has(p.id);
            const stock = totalStock(p);
            const invested = p.costPrice != null ? p.costPrice * stock : null;
            return (
              <tr key={p.id}>
                <td>
                  <div className="admin-table__product">
                    <div className="admin-table__thumb">
                      <ProductVisual
                        images={p.images}
                        colors={p.colors}
                        pattern={p.pattern}
                        uid={`inv-${p.id}`}
                        alt={p.name}
                      />
                    </div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                  </div>
                </td>
                {hideCategoryColumn ? null : (
                  <td data-label="Categoría">{categoryName(p.category)}</td>
                )}
                <td data-label="Precio">
                  {formatPrice(p.price)}
                  {isOnSale(p) ? (
                    <span className="meta" style={{ marginLeft: 6 }}>
                      −{discountPercent(p)}%
                    </span>
                  ) : null}
                </td>
                <td data-label="Estado">
                  {!p.isVisible ? (
                    <span className="badge badge--out">Oculto</span>
                  ) : p.stockMode !== "propio" ? (
                    <span className="meta">Consultar talle</span>
                  ) : isSoldOut(p) ? (
                    <span className="badge badge--out">Agotado</span>
                  ) : p.isNew ? (
                    <span className="badge">Nuevo</span>
                  ) : (
                    <span className="meta">En stock</span>
                  )}
                </td>
                <td data-label="Stock">
                  {p.stockMode === "propio" ? (
                    <div className="inventory-stock-cell">
                      <button
                        type="button"
                        className="inventory-stock-toggle"
                        aria-expanded={isStockOpen}
                        onClick={() => onToggleStock(p.id)}
                      >
                        {stock} uds.
                        <IconChevron className="icon--sm" />
                      </button>
                      {isStockOpen ? (
                        <div className="inventory-stock-detail">
                          <div className="inventory-sizes">
                            {(p.variants ?? []).map((v) => (
                              <button
                                key={v.id}
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
                                    variantId: v.id,
                                    productName: p.name,
                                    size: v.size,
                                    stock: v.stock,
                                  })
                                }
                              >
                                {v.size} {v.stock}
                              </button>
                            ))}
                          </div>
                          {invested != null ? (
                            <p className="meta" style={{ marginTop: 6 }}>
                              Invertido: {formatPrice(invested)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="meta">—</span>
                  )}
                </td>
                <td>
                  <div className="admin-row-actions">
                    <Link
                      href={`/producto/${p.slug}`}
                      target="_blank"
                      className="admin-icon-btn"
                      aria-label="Ver en la tienda"
                      title="Ver en la tienda"
                    >
                      <IconExternal className="icon--sm" />
                    </Link>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      aria-label={p.isVisible ? "Ocultar producto" : "Mostrar producto"}
                      title={p.isVisible ? "Ocultar producto" : "Mostrar producto"}
                      disabled={actions.togglingId === p.id}
                      onClick={() => actions.onToggleVisibility(p)}
                    >
                      {p.isVisible ? (
                        <IconEye className="icon--sm" />
                      ) : (
                        <IconEyeOff className="icon--sm" />
                      )}
                    </button>
                    <Link
                      href={`/gestion-ssjblue/productos/${p.id}`}
                      className="btn btn--ghost btn--sm"
                      style={{ height: 32, paddingInline: 12 }}
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="admin-icon-btn admin-icon-btn--danger"
                      aria-label="Eliminar producto"
                      title="Eliminar"
                      disabled={actions.pendingId === p.id}
                      onClick={() => actions.onDelete(p)}
                    >
                      <IconTrash className="icon--sm" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
