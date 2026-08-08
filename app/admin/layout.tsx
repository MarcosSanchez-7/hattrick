import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { IconExternal } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: {
    default: "Panel de administración",
    template: "%s · Admin HATTRICK",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo">Hattrick</div>
          <span className="admin-sidebar__tag">Panel de administración</span>
        </div>
        <AdminNav />
        <div className="admin-sidebar__foot">
          <span className="admin-badge-dev">Sin contraseña · modo desarrollo</span>
          <Link href="/" target="_blank">
            Ver la tienda ↗
          </Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span
            className="label admin-topbar__label"
            style={{ color: "var(--ink-muted)" }}
          >
            Gestión de catálogo
          </span>
          <Link href="/" target="_blank" className="btn btn--ghost btn--sm">
            <IconExternal className="icon--sm" />
            <span className="admin-topbar__link-text">Ir a la tienda</span>
          </Link>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
