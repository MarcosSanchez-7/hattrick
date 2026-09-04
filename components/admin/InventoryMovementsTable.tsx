import type { InventoryMovement } from "@/lib/data";
import { PARAGUAY_TZ } from "@/lib/timezone";

const MOVEMENT_LABEL: Record<string, string> = {
  restock: "Reposición",
  correction: "Corrección",
  sale_in_store: "Venta (tienda)",
  sale_online: "Venta (web)",
  return: "Devolución",
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-PY", {
  timeZone: PARAGUAY_TZ,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function InventoryMovementsTable({
  movements,
}: {
  movements: InventoryMovement[];
}) {
  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          {movements.length} movimiento{movements.length !== 1 ? "s" : ""}
        </p>
      </div>

      {movements.length === 0 ? (
        <div className="admin-empty">
          No hay movimientos de stock registrados en este rango de fechas.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Nota</th>
                <th>Quién</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.productName}</div>
                    <div className="meta">Talla {m.size}</div>
                  </td>
                  <td className="meta" data-label="Fecha">
                    {dateTimeFormatter.format(new Date(m.createdAt))}
                  </td>
                  <td data-label="Tipo">
                    <span className="meta">
                      {MOVEMENT_LABEL[m.movementType] ?? m.movementType}
                    </span>
                  </td>
                  <td data-label="Cantidad">
                    {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                  </td>
                  <td className="meta" data-label="Nota">
                    {m.note ?? "—"}
                  </td>
                  <td className="meta" data-label="Quién">
                    {m.createdBy ?? "—"}
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
