import Link from "next/link";
import { getAllAdminUsers } from "@/lib/data";
import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuarios" };

export default async function AdminUsersPage() {
  const admin = await requireAdminPageAccess("users.manage");

  const users = await getAllAdminUsers();

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue" label="Panel" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Usuarios</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Quién puede entrar al panel y con qué rol.
          </p>
        </div>
        <Link href="/gestion-ssjblue/usuarios/nueva" className="btn btn--sm">
          Nuevo usuario
        </Link>
      </div>

      <AdminUsersTable users={users} currentAdminId={admin.id} />
    </>
  );
}
