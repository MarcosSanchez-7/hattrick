import { getInventoryMovements } from "@/lib/data";
import { InventoryMovementsTable } from "@/components/admin/InventoryMovementsTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Movimientos de stock" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function InventoryMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const fromDate = from || daysAgoStr(30);
  const toDate = to || todayStr();

  const movements = await getInventoryMovements({
    from: `${fromDate}T00:00:00`,
    to: `${toDate}T23:59:59`,
  });

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
