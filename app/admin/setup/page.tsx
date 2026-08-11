import { redirect } from "next/navigation";
import { getAdminUserCount } from "@/lib/data";
import { AdminSetupForm } from "@/components/admin/AdminSetupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crear administrador" };

export default async function AdminSetupPage() {
  // Solo funciona la primera vez. En cuanto exista un admin, se cierra para siempre.
  const count = await getAdminUserCount();
  if (count > 0) redirect("/admin/login");

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card">
        <h1 className="h2">Creá tu cuenta de administrador</h1>
        <p className="meta" style={{ marginTop: 8 }}>
          Es la primera vez que se abre el panel — esta cuenta tendrá acceso
          total (superadmin).
        </p>
        <AdminSetupForm />
      </div>
    </div>
  );
}
