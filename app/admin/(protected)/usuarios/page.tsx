import Link from "next/link";
import { redirect } from "next/navigation";
import { getAllAdminUsers } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuarios" };

export default async function AdminUsersPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "superadmin") redirect("/admin");

  const users = await getAllAdminUsers();

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Usuarios</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Quién puede entrar al panel y con qué rol.
          </p>
        </div>
        <Link href="/admin/usuarios/nueva" className="btn btn--sm">
          Nuevo usuario
        </Link>
      </div>

      <AdminUsersTable users={users} currentAdminId={admin.id} />
    </>
  );
}
