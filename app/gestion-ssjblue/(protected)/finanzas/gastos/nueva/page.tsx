import { redirect } from "next/navigation";
import { getFinanceAccounts } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo gasto" };

export default async function NewExpensePage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const accounts = await getFinanceAccounts();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/gastos" label="Gastos" />
        <span>/</span>
        <span>Nuevo</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nuevo gasto
      </h1>
      <ExpenseForm accounts={accounts} />
    </>
  );
}
