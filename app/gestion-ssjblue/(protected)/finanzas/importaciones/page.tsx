import Link from "next/link";
import { redirect } from "next/navigation";
import { getImportPurchases } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { ImportPurchasesTable } from "@/components/admin/ImportPurchasesTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { daysAgoInParaguay, paraguayDayRangeToUtc, todayInParaguay } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Importaciones" };

export default async function ImportPurchasesPage({
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

  const purchases = await getImportPurchases(paraguayDayRangeToUtc(fromDate, toDate));

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue/finanzas" label="Finanzas" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Importaciones</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Compras hechas en China: costo en dólares, cotización de Paypal,
            courier y peso — el total en guaraníes se calcula solo, con el
            10% de impuesto ya incluido.
          </p>
        </div>
        <div className="row gap-3">
          <Link
            href="/gestion-ssjblue/finanzas/importaciones/couriers"
            className="btn btn--ghost btn--sm"
          >
            Couriers
          </Link>
          <Link href="/gestion-ssjblue/finanzas/importaciones/nueva" className="btn btn--sm">
            Nueva importación
          </Link>
        </div>
      </div>

      <DateRangeFilter
        storageKey="finanzas-importaciones"
        defaultFrom={fromDate}
        defaultTo={toDate}
        resetHref="/gestion-ssjblue/finanzas/importaciones"
        resetLabel="Últimos 90 días"
      />

      <ImportPurchasesTable purchases={purchases} />
    </>
  );
}
