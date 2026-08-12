import { notFound, redirect } from "next/navigation";
import { getFinanceAccounts, getFinanceEntries } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar gasto" };

export default async function EditExpensePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const { id } = await params;
  const [expenses, accounts] = await Promise.all([
    getFinanceEntries(undefined, "gasto"),
    getFinanceAccounts(),
  ]);
  const expense = expenses.find((e) => e.id === id);
  if (!expense) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/gastos" label="Gastos" />
        <span>/</span>
        <span>Editar</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar gasto
      </h1>
      <ExpenseForm expense={expense} accounts={accounts} />
    </>
  );
}
