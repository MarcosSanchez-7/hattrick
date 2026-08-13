import Link from "next/link";
import { redirect } from "next/navigation";
import { getMerchandisePurchases } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { PurchasesTable } from "@/components/admin/PurchasesTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compras de mercadería" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const { from, to } = await searchParams;
  const fromDate = from || daysAgoStr(90);
  const toDate = to || todayStr();

  const purchases = await getMerchandisePurchases({
    from: `${fromDate}T00:00:00`,
    to: `${toDate}T23:59:59`,
  });

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue/finanzas" label="Finanzas" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Compras de mercadería</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Cuándo y a qué precio se está adquiriendo stock nuevo. Es un
            registro informativo de plata: si el producto es de stock
            propio, actualizá también la cantidad en Inventario.
          </p>
        </div>
        <Link href="/gestion-ssjblue/finanzas/compras/nueva" className="btn btn--sm">
          Nueva compra
        </Link>
      </div>

      <DateRangeFilter
        storageKey="finanzas-compras"
        defaultFrom={fromDate}
        defaultTo={toDate}
        resetHref="/gestion-ssjblue/finanzas/compras"
        resetLabel="Últimos 90 días"
      />

      <PurchasesTable purchases={purchases} />
    </>
  );
}
