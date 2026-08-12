import Link from "next/link";
import { redirect } from "next/navigation";
import { getFinanceAccounts } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { FinanceAccountsTable } from "@/components/admin/FinanceAccountsTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cuentas y tarjetas" };

export default async function FinanceAccountsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

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
