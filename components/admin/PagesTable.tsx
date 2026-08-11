"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Page, PagePlacement } from "@/lib/catalog";
import { IconExternal, IconTrash } from "@/components/ui/Icons";

const PLACEMENT_LABEL: Record<PagePlacement, string> = {
  legal: "Legal",
  ayuda: "Ayuda",
  empresa: "Empresa",
};

export function PagesTable({ pages }: { pages: Page[] }) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const handleDelete = async (page: Page) => {
    if (!window.confirm(`¿Eliminar la página «${page.title}»?`)) return;
    setPendingSlug(page.slug);
    try {
      const res = await fetch(`/api/admin/pages/${page.slug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar la página.");
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setPendingSlug(null);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          {pages.length} página{pages.length !== 1 ? "s" : ""}
        </p>
      </div>

      {pages.length === 0 ? (
        <div className="admin-empty">Todavía no has creado ninguna página.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Página</th>
                <th>Dónde aparece</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.slug}>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td className="meta">{PLACEMENT_LABEL[p.placement]}</td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/pagina/${p.slug}`}
                        target="_blank"
                        className="admin-icon-btn"
                        aria-label="Ver en la tienda"
                        title="Ver en la tienda"
                      >
                        <IconExternal className="icon--sm" />
                      </Link>
                      <Link
                        href={`/gestion-ssjblue/paginas/${p.slug}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Eliminar página"
                        title="Eliminar"
                        disabled={pendingSlug === p.slug}
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
