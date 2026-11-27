import Link from "next/link";
import { getFinanceAccounts } from "@/lib/data";
import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { FinanceAccountsTable } from "@/components/admin/FinanceAccountsTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cuentas y tarjetas" };

export default async function FinanceAccountsPage() {
  await requireAdminPageAccess("finance.access");

  const accounts = await getFinanceAccounts();

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue/finanzas" label="Finanzas" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Cuentas y tarjetas</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Saldo disponible por cuenta o tarjeta. Lo actualizás vos mismo
            cuando cambie, no se calcula automáticamente.
          </p>
        </div>
        <Link href="/gestion-ssjblue/finanzas/cuentas/nueva" className="btn btn--sm">
          Nueva cuenta
        </Link>
      </div>

      <FinanceAccountsTable accounts={accounts} />
    </>
  );
}
