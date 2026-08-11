"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminRole } from "@/lib/admin-auth";
import type { AdminUser } from "@/lib/data";

const ROLES: { value: AdminRole; label: string; help: string }[] = [
  { value: "superadmin", label: "Superadmin", help: "Acceso total, incluida la gestión de usuarios." },
  { value: "editor", label: "Editor", help: "Puede editar catálogo, ventas y ajustes." },
  { value: "viewer", label: "Solo lectura", help: "Puede ver el panel, sin editar nada." },
];

export function AdminUserForm({ user }: { user?: AdminUser }) {
  const router = useRouter();
  const isEdit = Boolean(user);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<AdminRole>(user?.role ?? "editor");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEdit && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/users/${user!.id}` : "/api/admin/users",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit
              ? { name: name.trim(), role, password: password || undefined }
              : { name: name.trim(), email: email.trim(), role, password },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el usuario.");
      router.push("/admin/usuarios");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Datos del usuario</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              required
              disabled={isEdit}
              value={isEdit ? user!.email : email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {isEdit ? (
              <p className="admin-help">El correo no se puede cambiar.</p>
            ) : null}
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="role">Rol</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="admin-help">{ROLES.find((r) => r.value === role)?.help}</p>
        </div>

        <div className="admin-field">
          <label htmlFor="password">
            {isEdit ? "Nueva contraseña" : "Contraseña"}
          </label>
          <input
            id="password"
            type="password"
            required={!isEdit}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? "Dejalo vacío para no cambiarla" : undefined}
          />
          <p className="admin-help">Mínimo 8 caracteres.</p>
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/admin/usuarios")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}
