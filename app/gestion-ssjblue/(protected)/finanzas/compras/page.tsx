import Link from "next/link";
import { redirect } from "next/navigation";
import { getMerchandisePurchases } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { PurchasesTable } from "@/components/admin/PurchasesTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { daysAgoInParaguay, paraguayDayRangeToUtc, todayInParaguay } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compras de mercadería" };

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const { from, to } = await searchParams;
  const fromDate = from || daysAgoInParaguay(90);
  const toDate = to || todayInParaguay();

  const purchases = await getMerchandisePurchases(paraguayDayRangeToUtc(fromDate, toDate));

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
