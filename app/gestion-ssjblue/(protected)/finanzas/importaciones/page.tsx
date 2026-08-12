import Link from "next/link";
import { redirect } from "next/navigation";
import { getImportPurchases } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { ImportPurchasesTable } from "@/components/admin/ImportPurchasesTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Importaciones" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function ImportPurchasesPage({
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

  const purchases = await getImportPurchases({
    from: `${fromDate}T00:00:00`,
    to: `${toDate}T23:59:59`,
  });

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
          <Link href="/gestion-ssjblue/finanzas/importaciones" className="meta link-underline">
            Últimos 90 días
          </Link>
        </div>
      </form>

      <ImportPurchasesTable purchases={purchases} />
    </>
  );
}
