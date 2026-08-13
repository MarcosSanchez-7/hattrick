import Link from "next/link";
import { redirect } from "next/navigation";
import { getFinanceEntries } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { ExpensesTable } from "@/components/admin/ExpensesTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gastos" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const { from, to } = await searchParams;
  const fromDate = from || daysAgoStr(30);
  const toDate = to || todayStr();

  const expenses = await getFinanceEntries(
    { from: `${fromDate}T00:00:00`, to: `${toDate}T23:59:59` },
    "gasto",
  );

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue/finanzas" label="Finanzas" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Gastos</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Gastos fijos (se repiten mes a mes) o variables, según necesites
            cargar cada uno.
          </p>
        </div>
        <Link href="/gestion-ssjblue/finanzas/gastos/nueva" className="btn btn--sm">
          Nuevo gasto
        </Link>
      </div>

      <DateRangeFilter
        storageKey="finanzas-gastos"
        defaultFrom={fromDate}
        defaultTo={toDate}
        resetHref="/gestion-ssjblue/finanzas/gastos"
        resetLabel="Últimos 30 días"
      />

      <ExpensesTable expenses={expenses} />
    </>
  );
}
