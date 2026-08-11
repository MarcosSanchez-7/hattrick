import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-session";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { IconExternal } from "@/components/ui/Icons";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  editor: "Editor",
  viewer: "Solo lectura",
};

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo">Hattrick</div>
          <span className="admin-sidebar__tag">Panel de administración</span>
        </div>
        <AdminNav role={admin.role} />
        <div className="admin-sidebar__foot">
          <div className="admin-sidebar__user">
            {admin.name}
            <span className="admin-sidebar__user-role">
              {ROLE_LABEL[admin.role] ?? admin.role}
            </span>
          </div>
          <AdminLogoutButton />
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
