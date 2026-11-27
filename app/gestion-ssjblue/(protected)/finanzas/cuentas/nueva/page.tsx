import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { FinanceAccountForm } from "@/components/admin/FinanceAccountForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva cuenta" };

export default async function NewFinanceAccountPage() {
  await requireAdminPageAccess("finance.access");

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/cuentas" label="Cuentas y tarjetas" />
        <span>/</span>
        <span>Nueva</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nueva cuenta
      </h1>
      <FinanceAccountForm />
    </>
  );
}
