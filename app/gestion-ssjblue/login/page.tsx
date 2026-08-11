import { redirect } from "next/navigation";
import { getAdminUserCount } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Iniciar sesión" };

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/gestion-ssjblue");

  // Primera vez que se abre el panel: todavía no existe ningún admin.
  const count = await getAdminUserCount();
  if (count === 0) redirect("/gestion-ssjblue/setup");

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card">
        <h1 className="h2">Hattrick</h1>
        <p className="meta" style={{ marginTop: 8 }}>
          Panel de administración
        </p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
