import { getInventoryMovements } from "@/lib/data";
import { InventoryMovementsTable } from "@/components/admin/InventoryMovementsTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { daysAgoInParaguay, paraguayDayRangeToUtc, todayInParaguay } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Movimientos de stock" };

export default async function InventoryMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const fromDate = from || daysAgoInParaguay(30);
  const toDate = to || todayInParaguay();

  const movements = await getInventoryMovements(paraguayDayRangeToUtc(fromDate, toDate));

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue/inventario" label="Inventario" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Movimientos de stock</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Historial de reposiciones, correcciones y ventas que afectaron el
            stock de cada talla.
          </p>
        </div>
      </div>

      <DateRangeFilter
        storageKey="inventario-movimientos"
        defaultFrom={fromDate}
        defaultTo={toDate}
        resetHref="/gestion-ssjblue/inventario/movimientos"
        resetLabel="Últimos 30 días"
      />

      <InventoryMovementsTable movements={movements} />
    </>
  );
}
