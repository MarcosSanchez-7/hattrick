import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { CourierForm } from "@/components/admin/CourierForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo courier" };

export default async function NewCourierPage() {
  await requireAdminPageAccess("finance.access");

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
