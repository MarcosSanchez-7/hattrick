import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-session";
import { CourierForm } from "@/components/admin/CourierForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo courier" };

export default async function NewCourierPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/importaciones/couriers" label="Couriers" />
        <span>/</span>
        <span>Nuevo</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nuevo courier
      </h1>
      <CourierForm />
    </>
  );
}
