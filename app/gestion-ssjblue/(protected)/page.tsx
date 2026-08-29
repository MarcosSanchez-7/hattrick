import Link from "next/link";
import { isOnSale, isSoldOut, saleProfit, saleTotal } from "@/lib/catalog";
import { getAllCategories, getAllProducts, getSales } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { BarChart } from "@/components/admin/charts/BarChart";
import { DonutChart } from "@/components/admin/charts/DonutChart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel" };

// Mismo umbral que usa Inventario para marcar tallas de stock bajo.
const LOW_STOCK_THRESHOLD = 3;

const MONTH_LABELS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`;
}

function monthsAgoStr(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default async function AdminDashboard() {
  const [products, categories, recentSales] = await Promise.all([
    getAllProducts({ includeHidden: true }),
    getAllCategories({ includeHidden: true }),
    getSales({ from: `${monthsAgoStr(5)}T00:00:00` }),
  ]);

  const onSale = products.filter(isOnSale).length;
  const soldOut = products.filter(isSoldOut).length;

  const stockBajo = products
    .filter((p) => p.stockMode === "propio" || p.internalControl)
    .flatMap((p) => p.variants ?? [])
    .filter((v) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD).length;

  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7);
  const currentMonthSales = recentSales.filter((s) => monthKey(s.soldAt) === currentMonthKey);
  const vendidoEsteMes = currentMonthSales.reduce((acc, s) => acc + saleTotal(s), 0);
  const gananciaEsteMes = currentMonthSales.reduce((acc, s) => acc + saleProfit(s), 0);

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const ventasPorMes = new Map<string, number>();
  for (const s of recentSales) {
    const key = monthKey(s.soldAt);
    ventasPorMes.set(key, (ventasPorMes.get(key) ?? 0) + saleTotal(s));
  }

  const productosPorCategoria = categories
    .map((c) => ({
      label: c.name,
      value: products.filter((p) => p.category === c.slug).length,
    }))
    .filter((d) => d.value > 0);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Panel</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Vista general del negocio: catálogo, stock y ventas del mes.
          </p>
        </div>
        <div className="row gap-3">
          <Link href="/gestion-ssjblue/categorias/nueva" className="btn btn--ghost btn--sm">
            Nueva categoría
          </Link>
          <Link href="/gestion-ssjblue/productos/nuevo" className="btn btn--sm">
            Nuevo producto
          </Link>
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat__value">{products.length}</div>
          <div className="admin-stat__label">Productos totales</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{categories.length}</div>
          <div className="admin-stat__label">Categorías</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{onSale}</div>
          <div className="admin-stat__label">En oferta</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{soldOut}</div>
          <div className="admin-stat__label">Agotados</div>
        </div>
      </div>

      <p className="h3" style={{ fontSize: "0.9375rem", margin: "32px 0 12px" }}>
        Este mes
      </p>
      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(vendidoEsteMes)}</div>
          <div className="admin-stat__label">Vendido este mes</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{formatPrice(gananciaEsteMes)}</div>
          <div className="admin-stat__label">Ganancia este mes</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{currentMonthSales.length}</div>
          <div className="admin-stat__label">Ventas este mes</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{stockBajo}</div>
          <div className="admin-stat__label">Tallas con stock bajo</div>
        </div>
      </div>

      <div className="admin-form__grid" style={{ marginTop: 32 }}>
        <div className="admin-card" style={{ padding: "var(--sp-5)" }}>
          <p className="h3" style={{ fontSize: "0.9375rem", marginBottom: 16 }}>
            Ventas de los últimos 6 meses
          </p>
          <BarChart
            categories={months.map(monthLabel)}
            series={[
              {
                label: "Vendido",
                color: "#2f2f2f",
                values: months.map((m) => ventasPorMes.get(m) ?? 0),
              },
            ]}
            formatValue={formatPrice}
          />
        </div>

        <div className="admin-card" style={{ padding: "var(--sp-5)" }}>
          <p className="h3" style={{ fontSize: "0.9375rem", marginBottom: 16 }}>
            Productos por categoría
          </p>
          <DonutChart data={productosPorCategoria} />
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="admin-help" style={{ marginTop: 20 }}>
          Consejo: crea al menos una categoría antes de añadir productos.
        </p>
      ) : null}
    </>
  );
}
