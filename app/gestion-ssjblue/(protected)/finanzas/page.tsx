import Link from "next/link";
import { redirect } from "next/navigation";
import { getFinanceSummary, getInventoryValuation, getLiquiditySummary } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { formatPrice } from "@/lib/format";
import { BarChart } from "@/components/admin/charts/BarChart";
import { DonutChart } from "@/components/admin/charts/DonutChart";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finanzas" };

const MONTH_LABELS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthsAgoStr(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const { from, to } = await searchParams;
  const fromDate = from || monthsAgoStr(6);
  const toDate = to || todayStr();

  const [summary, inventoryValuation, liquidity] = await Promise.all([
    getFinanceSummary({
      from: `${fromDate}T00:00:00`,
      to: `${toDate}T23:59:59`,
    }),
    getInventoryValuation(),
    getLiquiditySummary(),
  ]);

  const patrimonioAproximado = liquidity.liquidezTotal + inventoryValuation.costValue;

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue" label="Panel" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Finanzas</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Panorama del negocio: ventas, gastos, importación y capital.
          </p>
        </div>
        <div className="row gap-3">
          <Link href="/gestion-ssjblue/finanzas/cuentas" className="btn btn--ghost btn--sm">
            Cuentas y tarjetas
          </Link>
          <Link href="/gestion-ssjblue/finanzas/compras" className="btn btn--ghost btn--sm">
            Compras de mercadería
          </Link>
          <Link href="/gestion-ssjblue/finanzas/movimientos" className="btn btn--sm">
            Ver movimientos
          </Link>
        </div>
      </div>

      <p className="h3" style={{ fontSize: "0.9375rem", marginBottom: 12 }}>
        Patrimonio actual
      </p>
      <p className="admin-help" style={{ marginTop: 0, marginBottom: 12 }}>
        No depende del rango de fechas de abajo — es la foto de ahora mismo.
      </p>
      <div className="admin-stats" style={{ marginBottom: 40 }}>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(inventoryValuation.costValue)}</div>
          <div className="admin-stat__label">Valor de stock (a costo)</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(inventoryValuation.retailValue)}</div>
          <div className="admin-stat__label">Valor de stock (a venta)</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(liquidity.liquidezTotal)}</div>
          <div className="admin-stat__label">Liquidez total</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(patrimonioAproximado)}</div>
          <div className="admin-stat__label">Patrimonio aproximado</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(liquidity.efectivo)}</div>
          <div className="admin-stat__label">Efectivo</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(liquidity.cuentaBancaria)}</div>
          <div className="admin-stat__label">Cuentas bancarias</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(liquidity.tarjetaCredito)}</div>
          <div className="admin-stat__label">Tarjetas de crédito</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(liquidity.tarjetaDebito)}</div>
          <div className="admin-stat__label">Tarjetas de débito</div>
        </div>
      </div>

      <p className="h3" style={{ fontSize: "0.9375rem", marginBottom: 12 }}>
        Resultado del período
      </p>

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
          <Link href="/gestion-ssjblue/finanzas" className="meta link-underline">
            Últimos 6 meses
          </Link>
        </div>
      </form>

      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(summary.ventasTotal)}</div>
          <div className="admin-stat__label">Ventas totales</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(summary.ventasGanancia)}</div>
          <div className="admin-stat__label">Ganancia de ventas</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{summary.margenPromedio.toFixed(1)}%</div>
          <div className="admin-stat__label">Margen promedio</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(summary.ingresosOtros)}</div>
          <div className="admin-stat__label">Otros ingresos</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(summary.gastos)}</div>
          <div className="admin-stat__label">Gastos</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(summary.comprasMercaderia)}</div>
          <div className="admin-stat__label">Compras de mercadería</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(summary.importacion)}</div>
          <div className="admin-stat__label">Importación</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(summary.capitalNeto)}</div>
          <div className="admin-stat__label">Capital neto aportado</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(summary.utilidadNeta)}</div>
          <div className="admin-stat__label">Utilidad neta</div>
        </div>
      </div>

      <div className="admin-form__grid" style={{ marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: "var(--sp-5)" }}>
          <p className="h3" style={{ fontSize: "0.9375rem", marginBottom: 16 }}>
            Ingresos vs. gastos por mes
          </p>
          {summary.serieMensual.length === 0 ? (
            <p className="admin-empty">No hay datos para graficar en este rango.</p>
          ) : (
            <BarChart
              categories={summary.serieMensual.map((m) => monthLabel(m.month))}
              series={[
                {
                  label: "Ingresos",
                  color: "#2f2f2f",
                  values: summary.serieMensual.map((m) => m.ingresos),
                },
                {
                  label: "Gastos",
                  color: "#a64b4b",
                  values: summary.serieMensual.map((m) => m.gastos),
                },
              ]}
              formatValue={formatPrice}
            />
          )}
        </div>

        <div className="admin-card" style={{ padding: "var(--sp-5)" }}>
          <p className="h3" style={{ fontSize: "0.9375rem", marginBottom: 16 }}>
            Gastos por categoría
          </p>
          <DonutChart
            data={summary.gastosPorCategoria.map((g) => ({
              label: g.category,
              value: g.amount,
            }))}
            formatValue={formatPrice}
          />
        </div>
      </div>
    </>
  );
}
