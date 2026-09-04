import Link from "next/link";
import { getSales } from "@/lib/data";
import { SalesTable } from "@/components/admin/SalesTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { paraguayDayRangeToUtc, todayInParaguay } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ventas" };

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const fromDate = from || todayInParaguay();
  const toDate = to || fromDate;

  const sales = await getSales(paraguayDayRangeToUtc(fromDate, toDate));

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue" label="Panel" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Ventas diarias</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Registro de ventas físicas y por otros canales. Cada venta
            descuenta el stock de la web automáticamente.
          </p>
        </div>
        <div className="row gap-3">
          <Link
            href={`/api/admin/sales/export?from=${fromDate}&to=${toDate}`}
            className="btn btn--ghost btn--sm"
          >
            Descargar CSV
          </Link>
          <Link href="/gestion-ssjblue/ventas/importar" className="btn btn--ghost btn--sm">
            Importar CSV
          </Link>
          <Link href="/gestion-ssjblue/ventas/nueva" className="btn btn--sm">
            Registrar venta
          </Link>
        </div>
      </div>

      <DateRangeFilter
        storageKey="ventas"
        defaultFrom={fromDate}
        defaultTo={toDate}
        resetHref="/gestion-ssjblue/ventas"
        resetLabel="Hoy"
      />

      <SalesTable sales={sales} />
    </>
  );
}
