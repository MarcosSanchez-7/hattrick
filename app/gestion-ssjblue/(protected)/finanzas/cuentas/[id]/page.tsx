import { notFound } from "next/navigation";
import { getFinanceAccounts } from "@/lib/data";
import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { FinanceAccountForm } from "@/components/admin/FinanceAccountForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar cuenta" };

export default async function EditFinanceAccountPage({
  params,
}: {
  params: Promise<Params>;
}) {
  await requireAdminPageAccess("finance.access");

  const { id } = await params;
  const accounts = await getFinanceAccounts();
  const account = accounts.find((a) => a.id === id);
  if (!account) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/cuentas" label="Cuentas y tarjetas" />
        <span>/</span>
        <span>{account.name}</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar cuenta
      </h1>
      <FinanceAccountForm account={account} />
    </>
  );
}
