import { getFinanceAccounts } from "@/lib/data";
import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { FinanceEntryForm } from "@/components/admin/FinanceEntryForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo movimiento" };

export default async function NewFinanceEntryPage() {
  await requireAdminPageAccess("finance.access");

  const accounts = await getFinanceAccounts();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/movimientos" label="Movimientos" />
        <span>/</span>
        <span>Nuevo</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nuevo movimiento
      </h1>
      <FinanceEntryForm accounts={accounts} />
    </>
  );
}
