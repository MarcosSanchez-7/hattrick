import Link from "next/link";
import { getSales } from "@/lib/data";
import { SalesTable } from "@/components/admin/SalesTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ventas" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const fromDate = from || todayStr();
  const toDate = to || fromDate;

  const sales = await getSales({
    from: `${fromDate}T00:00:00`,
    to: `${toDate}T23:59:59`,
  });

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
        <Link href="/gestion-ssjblue/ventas/nueva" className="btn btn--sm">
          Registrar venta
        </Link>
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
          <Link href="/gestion-ssjblue/ventas" className="meta link-underline">
            Hoy
          </Link>
        </div>
      </form>

      <SalesTable sales={sales} />
    </>
  );
}
