import Link from "next/link";
import { redirect } from "next/navigation";
import { getMerchandisePurchases } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { PurchasesTable } from "@/components/admin/PurchasesTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

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
          <Link href="/gestion-ssjblue/finanzas/compras" className="meta link-underline">
            Últimos 90 días
          </Link>
        </div>
      </form>

      <PurchasesTable purchases={purchases} />
    </>
  );
}
