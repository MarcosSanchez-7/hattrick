import { saleProfit, saleTotal, SALE_CHANNELS, type Sale } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

const channelLabel = (value: string) =>
  SALE_CHANNELS.find((c) => c.value === value)?.label ?? value;

const dateFormatter = new Intl.DateTimeFormat("es-PY", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function CustomerPurchaseHistory({ sales }: { sales: Sale[] }) {
  if (sales.length === 0) {
    return (
      <div className="admin-empty">Este cliente todavía no tiene compras registradas.</div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Artículos</th>
            <th>Canal</th>
            <th>Total</th>
            <th>Ganancia</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td className="meta" data-label="Fecha">
                {dateFormatter.format(new Date(sale.soldAt))}
              </td>
              <td data-label="Artículos">
                {sale.items.map((item) => (
                  <div
                    key={item.id}
                    className="row gap-2"
                    style={{ alignItems: "center", marginBottom: 4 }}
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        style={{
                          width: 28,
                          height: 34,
                          objectFit: "cover",
                          flexShrink: 0,
                          border: "1px solid var(--line)",
                        }}
                      />
                    ) : null}
                    <span>
                      {item.name} · Talla {item.size} × {item.quantity}
                      {item.note ? ` · ${item.note}` : ""}
                    </span>
                  </div>
                ))}
              </td>
              <td data-label="Canal">
                <span className="meta">{channelLabel(sale.channel)}</span>
              </td>
              <td data-label="Total">{formatPrice(saleTotal(sale))}</td>
              <td data-label="Ganancia">{formatPrice(saleProfit(sale))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
