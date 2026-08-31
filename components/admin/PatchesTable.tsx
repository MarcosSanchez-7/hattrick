"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isPatchAvailable, type Patch } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { imageVariant } from "@/lib/image";
import { IconTrash } from "@/components/ui/Icons";

export function PatchesTable({ patches }: { patches: Patch[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDelete = async (patch: Patch) => {
    if (!window.confirm(`¿Eliminar «${patch.name}»?`)) return;
    setPendingId(patch.id);
    try {
      const res = await fetch(`/api/admin/patches/${patch.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar el parche.");
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          {patches.length} parche{patches.length !== 1 ? "s" : ""}
        </p>
      </div>

      {patches.length === 0 ? (
        <div className="admin-empty">Todavía no has creado ningún parche.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Parche</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {patches.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-table__product">
                      <div
                        className="admin-table__thumb"
                        style={{ width: 32, height: 32, position: "relative" }}
                      >
                        {p.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageVariant(p.images[0], "thumb")}
                            alt={p.name}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            loading="lazy"
                          />
                        ) : null}
                        {p.images.length > 1 ? (
                          <span
                            className="badge"
                            style={{
                              position: "absolute",
                              bottom: -4,
                              right: -4,
                              fontSize: "0.5625rem",
                              height: 16,
                              paddingInline: 4,
                            }}
                          >
                            +{p.images.length - 1}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                    </div>
                  </td>
                  <td data-label="Categoría">
                    {p.category ?? <span className="meta">Sin categoría</span>}
                  </td>
                  <td data-label="Precio">{formatPrice(p.price)}</td>
                  <td data-label="Stock">
                    {p.stock === 0 ? (
                      <span className="badge badge--out">Sin stock</span>
                    ) : (
                      p.stock
                    )}
                  </td>
                  <td data-label="Estado">
                    {isPatchAvailable(p) ? (
                      <span className="meta">Disponible</span>
                    ) : !p.isVisible ? (
                      <span className="badge badge--out">Oculto</span>
                    ) : (
                      <span className="badge badge--out">Oculto (sin stock)</span>
                    )}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/gestion-ssjblue/generales/parches/${p.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Eliminar parche"
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
