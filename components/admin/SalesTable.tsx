import { SALE_CHANNELS, lineProfit, lineTotal, type Sale } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

const channelLabel = (value: string) =>
  SALE_CHANNELS.find((c) => c.value === value)?.label ?? value;

const dateTimeFormatter = new Intl.DateTimeFormat("es-PY", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function SalesTable({ sales }: { sales: Sale[] }) {
  const rows = sales.flatMap((sale) =>
    sale.items.map((item) => ({ sale, item })),
  );

  const totalVenta = rows.reduce((acc, r) => acc + lineTotal(r.item), 0);
  const totalGanancia = rows.reduce((acc, r) => acc + lineProfit(r.item), 0);
  const totalUnidades = rows.reduce((acc, r) => acc + r.item.quantity, 0);

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          {sales.length} venta{sales.length !== 1 ? "s" : ""} · {totalUnidades}{" "}
          artículo{totalUnidades !== 1 ? "s" : ""}
        </p>
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          Total {formatPrice(totalVenta)} · Ganancia {formatPrice(totalGanancia)}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="admin-empty">
          No hay ventas registradas en este rango de fechas.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Artículo</th>
                <th>Cant.</th>
                <th>Precio compra</th>
                <th>Precio venta</th>
                <th>Ganancia</th>
                <th>Canal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ sale, item }) => (
                <tr key={item.id}>
                  <td className="meta">
                    {dateTimeFormatter.format(new Date(sale.soldAt))}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div className="meta">Talla {item.size}</div>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.costPrice)}</td>
                  <td>{formatPrice(item.unitPrice)}</td>
                  <td>{formatPrice(lineProfit(item))}</td>
                  <td>
                    <span className="meta">{channelLabel(sale.channel)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
