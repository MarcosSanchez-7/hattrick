"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  categoryChildren,
  categorySlugPath,
  orderCategoriesTree,
  type Category,
} from "@/lib/catalog";
import { IconExternal, IconEye, IconEyeOff, IconTrash } from "@/components/ui/Icons";

export function CategoriesTable({
  categories,
  productCounts,
}: {
  categories: Category[];
  productCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`¿Eliminar la categoría «${category.name}»?`)) return;
    setPendingSlug(category.slug);
    try {
      const res = await fetch(`/api/admin/categories/${category.slug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar la categoría.");
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setPendingSlug(null);
    }
  };

  const handleToggleVisibility = async (category: Category) => {
    setTogglingSlug(category.slug);
    try {
      const res = await fetch(`/api/admin/categories/${category.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !category.isVisible }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo cambiar la visibilidad.");
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setTogglingSlug(null);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          {categories.length} categoría{categories.length !== 1 ? "s" : ""}
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="admin-empty">Todavía no has creado ninguna categoría.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Eslogan</th>
                <th>Productos</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {orderCategoriesTree(categories).map(({ category: c, depth }) => {
                const count = productCounts[c.slug] ?? 0;
                const childCount = categoryChildren(categories, c.slug).length;
                const blockedReason =
                  childCount > 0
                    ? "No se puede eliminar: tiene subcategorías"
                    : count > 0
                      ? "No se puede eliminar: tiene productos"
                      : "Eliminar";
                return (
                  <tr key={c.slug}>
                    <td>
                      <div
                        className="admin-table__product"
                        style={{ paddingLeft: depth * 20 }}
                      >
                        <div className="admin-table__thumb">
                          {c.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.image} alt={c.name} />
                          ) : (
                            <span className="meta" style={{ fontSize: "0.625rem" }}>
                              Sin foto
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          {depth > 0 ? "— " : ""}
                          {c.name}
                        </div>
                      </div>
                    </td>
                    <td className="meta">{c.tagline}</td>
                    <td>{count}</td>
                    <td>
                      {c.isVisible ? (
                        <span className="meta">Visible</span>
                      ) : (
                        <span className="badge badge--out">Oculta</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Link
                          href={`/categoria/${categorySlugPath(categories, c.slug).join("/")}`}
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
                          aria-label={c.isVisible ? "Ocultar categoría" : "Mostrar categoría"}
                          title={c.isVisible ? "Ocultar categoría" : "Mostrar categoría"}
                          disabled={togglingSlug === c.slug}
                          onClick={() => handleToggleVisibility(c)}
                        >
                          {c.isVisible ? (
                            <IconEye className="icon--sm" />
                          ) : (
                            <IconEyeOff className="icon--sm" />
                          )}
                        </button>
                        <Link
                          href={`/admin/categorias/${c.slug}`}
                          className="btn btn--ghost btn--sm"
                          style={{ height: 32, paddingInline: 12 }}
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--danger"
                          aria-label="Eliminar categoría"
                          title={blockedReason}
                          disabled={pendingSlug === c.slug || count > 0 || childCount > 0}
                          onClick={() => handleDelete(c)}
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
      )}
    </div>
  );
}
