"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/lib/data";
import { IconTrash } from "@/components/ui/Icons";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  editor: "Editor",
  viewer: "Solo lectura",
};

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
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
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
                  {ROLE_LABEL[u.role] ?? u.role}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
