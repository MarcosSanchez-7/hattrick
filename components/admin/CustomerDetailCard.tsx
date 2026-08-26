"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/data";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { IconChevron, IconFolder, IconTrash } from "@/components/ui/Icons";

const CustomerLocationView = dynamic(
  () => import("@/components/admin/CustomerLocationView"),
  {
    ssr: false,
    loading: () => <div className="location-picker__loading">Cargando mapa…</div>,
  },
);

/**
 * Toda la info del cliente (datos + ubicación) vive colapsada en esta
 * carpeta — el historial de compras es lo que importa ver primero al abrir
 * la ficha, así que esto arranca cerrado y en modo lectura, no como un
 * formulario abierto de entrada.
 */
export function CustomerDetailCard({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deleting, setDeleting] = useState(false);

  const location =
    customer.latitude != null && customer.longitude != null
      ? { lat: customer.latitude, lng: customer.longitude }
      : null;

  const handleDelete = async () => {
    if (
      !window.confirm(
        `¿Eliminar «${customer.name}»? Sus ventas no se borran, solo dejan de estar vinculadas a este cliente.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar el cliente.");
      }
      router.push("/gestion-ssjblue/clientes");
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error inesperado.");
      setDeleting(false);
    }
  };

  return (
    <div className="admin-cat-group">
      <button
        type="button"
        className="admin-cat-group__head"
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
      >
        <IconFolder className="icon--sm" />
        <span>Datos del cliente</span>
        <span className="meta">
          {[customer.city, customer.phone].filter(Boolean).join(" · ") || "Sin datos extra"}
        </span>
        <IconChevron className="icon--sm" />
      </button>

      {expanded ? (
        <div style={{ padding: "0 var(--sp-5) var(--sp-5)" }}>
          {mode === "edit" ? (
            <CustomerForm
              customer={customer}
              onCancel={() => setMode("view")}
              onSaved={() => setMode("view")}
            />
          ) : (
            <div className="stack gap-4">
              <div className="admin-form__grid">
                <div className="admin-field">
                  <span className="label">Nombre</span>
                  <p>{customer.name}</p>
                </div>
                <div className="admin-field">
                  <span className="label">Teléfono</span>
                  <p>{customer.phone || "—"}</p>
                </div>
                <div className="admin-field">
                  <span className="label">Ciudad</span>
                  <p>{customer.city || "—"}</p>
                </div>
                <div className="admin-field">
                  <span className="label">Barrio</span>
                  <p>{customer.neighborhood || "—"}</p>
                </div>
              </div>
              {customer.notes ? (
                <div className="admin-field">
                  <span className="label">Notas</span>
                  <p>{customer.notes}</p>
                </div>
              ) : null}

              <div className="admin-field">
                <span className="label">Ubicación de entrega</span>
                {location ? (
                  <CustomerLocationView value={location} />
                ) : (
                  <p className="meta">Sin ubicación marcada.</p>
                )}
              </div>

              <div className="admin-actions">
                <button
                  type="button"
                  className="admin-icon-btn admin-icon-btn--danger"
                  aria-label="Eliminar cliente"
                  title="Eliminar"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  <IconTrash className="icon--sm" />
                </button>
                <button type="button" className="btn btn--sm" onClick={() => setMode("edit")}>
                  Editar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
