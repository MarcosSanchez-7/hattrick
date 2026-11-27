import { getImportCouriers } from "@/lib/data";
import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { ImportPurchaseForm } from "@/components/admin/ImportPurchaseForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva importación" };

export default async function NewImportPurchasePage() {
  await requireAdminPageAccess("finance.access");

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
