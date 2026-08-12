import { redirect } from "next/navigation";
import { getImportCouriers } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { ImportPurchaseForm } from "@/components/admin/ImportPurchaseForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva importación" };

export default async function NewImportPurchasePage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const couriers = await getImportCouriers();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/importaciones" label="Importaciones" />
        <span>/</span>
        <span>Nueva</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nueva importación
      </h1>
      <ImportPurchaseForm couriers={couriers} />
    </>
  );
}
