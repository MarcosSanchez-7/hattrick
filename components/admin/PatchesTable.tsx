"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Patch } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
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
                <th>Precio</th>
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
                        style={{ width: 32, height: 32 }}
                      >
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image}
                            alt={p.name}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : null}
                      </div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                    </div>
                  </td>
                  <td data-label="Precio">{formatPrice(p.price)}</td>
                  <td data-label="Estado">
                    {p.isVisible ? (
                      <span className="meta">Disponible</span>
                    ) : (
                      <span className="badge badge--out">Oculto</span>
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
