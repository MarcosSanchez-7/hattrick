import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { PurchaseForm } from "@/components/admin/PurchaseForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva compra" };

export default async function NewPurchasePage() {
  await requireAdminPageAccess("finance.access");

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/compras" label="Compras" />
        <span>/</span>
        <span>Nueva</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nueva compra
      </h1>
      <PurchaseForm />
    </>
  );
}
