import { notFound } from "next/navigation";
import { getAllAdminUsers } from "@/lib/data";
import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { AdminUserForm } from "@/components/admin/AdminUserForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar usuario" };

export default async function EditAdminUserPage({
  params,
}: {
  params: Promise<Params>;
}) {
  await requireAdminPageAccess("users.manage");

  const { id } = await params;
  const users = await getAllAdminUsers();
  const user = users.find((u) => u.id === id);
  if (!user) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/usuarios" label="Usuarios" />
        <span>/</span>
        <span>{user.name}</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar usuario
      </h1>
      <AdminUserForm user={user} />
    </>
  );
}
