"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { discountPercent, isOnSale, isSoldOut, type Category, type Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconExternal, IconEye, IconEyeOff, IconTrash } from "@/components/ui/Icons";

export function ProductsTable({
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

  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, categoryName(p.category)].join(" ").toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, query, categories]);

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

      {visible.length === 0 ? (
        <div className="admin-empty">
          {products.length === 0
            ? "Todavía no has añadido ningún producto."
            : "Ningún producto coincide con la búsqueda."}
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-table__product">
                      <div className="admin-table__thumb">
                        <ProductVisual
                          images={p.images}
                          colors={p.colors}
                          pattern={p.pattern}
                          uid={`admin-${p.id}`}
                          alt={p.name}
                        />
                      </div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                    </div>
                  </td>
                  <td>{categoryName(p.category)}</td>
                  <td>
                    {formatPrice(p.price)}
                    {isOnSale(p) ? (
                      <span className="meta" style={{ marginLeft: 6 }}>
                        −{discountPercent(p)}%
                      </span>
                    ) : null}
                  </td>
                  <td>
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
                        disabled={togglingId === p.id}
                        onClick={() => handleToggleVisibility(p)}
                      >
                        {p.isVisible ? (
                          <IconEye className="icon--sm" />
                        ) : (
                          <IconEyeOff className="icon--sm" />
                        )}
                      </button>
                      <Link
                        href={`/admin/productos/${p.id}`}
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
                        disabled={pendingId === p.id}
                        onClick={() => handleDelete(p)}
                      >
                        <IconTrash className="icon--sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
