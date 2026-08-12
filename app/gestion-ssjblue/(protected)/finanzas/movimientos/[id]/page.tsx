import { notFound, redirect } from "next/navigation";
import { getFinanceAccounts, getFinanceEntries } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { FinanceEntryForm } from "@/components/admin/FinanceEntryForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar movimiento" };

export default async function EditFinanceEntryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const { id } = await params;
  const [entries, accounts] = await Promise.all([
    getFinanceEntries(),
    getFinanceAccounts(),
  ]);
  const entry = entries.find((e) => e.id === id);
  if (!entry) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/movimientos" label="Movimientos" />
        <span>/</span>
        <span>Editar</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar movimiento
      </h1>
      <FinanceEntryForm entry={entry} accounts={accounts} />
    </>
  );
}
