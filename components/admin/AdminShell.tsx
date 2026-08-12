"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { IconClose, IconMenu } from "@/components/ui/Icons";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  editor: "Editor",
  viewer: "Solo lectura",
};

export function AdminShell({
  role,
  name,
  children,
}: {
  role: AdminRole;
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Al navegar a otra sección, el menú móvil se cierra solo.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" data-open={menuOpen ? "true" : "false"}>
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo">Hattrick</div>
          <span className="admin-sidebar__tag">Panel de administración</span>
        </div>
        <AdminNav role={role} />
        <div className="admin-sidebar__foot">
          <div className="admin-sidebar__user">
            {name}
            <span className="admin-sidebar__user-role">
              {ROLE_LABEL[role] ?? role}
            </span>
          </div>
          <AdminLogoutButton />
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="admin-sidebar__backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-burger"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <IconClose className="icon--sm" />
            ) : (
              <IconMenu className="icon--sm" />
            )}
          </button>
          <span
            className="label admin-topbar__label"
            style={{ color: "var(--ink-muted)" }}
          >
            Gestión de catálogo
          </span>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
