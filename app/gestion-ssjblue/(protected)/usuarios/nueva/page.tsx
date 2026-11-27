import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { AdminUserForm } from "@/components/admin/AdminUserForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo usuario" };

export default async function NewAdminUserPage() {
  await requireAdminPageAccess("users.manage");

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/usuarios" label="Usuarios" />
        <span>/</span>
        <span>Nuevo</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nuevo usuario
      </h1>
      <AdminUserForm />
    </>
  );
}
