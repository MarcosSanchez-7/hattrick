import Link from "next/link";
import { getInventoryMovements } from "@/lib/data";
import { InventoryMovementsTable } from "@/components/admin/InventoryMovementsTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

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

      <form
        method="get"
        className="toolbar"
        style={{ marginBottom: 24, alignItems: "flex-end" }}
      >
        <div className="row gap-3">
          <div className="admin-field">
            <label htmlFor="from">Desde</label>
            <input id="from" type="date" name="from" defaultValue={fromDate} />
          </div>
          <div className="admin-field">
            <label htmlFor="to">Hasta</label>
            <input id="to" type="date" name="to" defaultValue={toDate} />
          </div>
          <button type="submit" className="btn btn--ghost btn--sm">
            Filtrar
          </button>
          <Link href="/gestion-ssjblue/inventario/movimientos" className="meta link-underline">
            Últimos 30 días
          </Link>
        </div>
      </form>

      <InventoryMovementsTable movements={movements} />
    </>
  );
}
