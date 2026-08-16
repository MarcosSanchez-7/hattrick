"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/lib/data";
import { ROLE_LABELS } from "@/lib/admin-auth";
import { formatRelativeTime } from "@/lib/format";
import { IconTrash } from "@/components/ui/Icons";

// Margen sobre el intervalo de 60s del heartbeat (AdminHeartbeat.tsx), para
// no marcar "desconectado" por una demora de red puntual.
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

export function AdminUsersTable({
  users,
  currentAdminId,
}: {
  users: AdminUser[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`¿Eliminar a «${user.name}»?`)) return;
    setPendingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar el usuario.");
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
          {users.length} usuario{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const online = isOnline(u.lastSeenAt);
              return (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>
                  {u.name}
                  {u.id === currentAdminId ? (
                    <span className="meta" style={{ marginLeft: 6 }}>
                      (vos)
                    </span>
                  ) : null}
                </td>
                <td className="meta" data-label="Correo">
                  {u.email}
                </td>
                <td className="meta" data-label="Rol">
                  {ROLE_LABELS[u.role] ?? u.role}
                </td>
                <td data-label="Estado">
                  <span className="row gap-2" style={{ alignItems: "center" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: online ? "#2f9e5c" : "var(--ink-muted)",
                        flex: "none",
                      }}
                    />
                    <span className="meta">
                      {online
                        ? "En línea"
                        : u.lastSeenAt
                          ? `Desconectado — ${formatRelativeTime(u.lastSeenAt)}`
                          : "Nunca conectado"}
                    </span>
                  </span>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <Link
                      href={`/gestion-ssjblue/usuarios/${u.id}`}
                      className="btn btn--ghost btn--sm"
                      style={{ height: 32, paddingInline: 12 }}
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="admin-icon-btn admin-icon-btn--danger"
                      aria-label="Eliminar usuario"
                      title={
                        u.id === currentAdminId
                          ? "No podés eliminar tu propio usuario"
                          : "Eliminar"
                      }
                      disabled={pendingId === u.id || u.id === currentAdminId}
                      onClick={() => handleDelete(u)}
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
    </div>
  );
}
