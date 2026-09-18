"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SALE_CHANNELS,
  SALE_STATUSES,
  SHIPPING_METHODS,
  lineProfit,
  lineTotal,
  type Sale,
  type SaleStatus,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { imageVariant } from "@/lib/image";
import { IconChevron, IconDocument, IconTrash } from "@/components/ui/Icons";
import { PARAGUAY_TZ } from "@/lib/timezone";

const channelLabel = (value: string) =>
  SALE_CHANNELS.find((c) => c.value === value)?.label ?? value;

const shippingMethodLabel = (value: string) =>
  SHIPPING_METHODS.find((m) => m.value === value)?.label ?? value;

/** Pastilla de color por estado (ver .admin-status-select--* en globals.css). */
function SaleStatusSelect({
  saleId,
  status,
  onChanged,
}: {
  saleId: string;
  status: SaleStatus;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState(false);

  const handleChange = async (next: SaleStatus) => {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/sales/${saleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo actualizar el estado.");
      }
      onChanged();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  };

  return (
    <select
      className={`admin-status-select admin-status-select--${status}`}
      value={status}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as SaleStatus)}
      aria-label="Estado de la venta"
    >
      {SALE_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-PY", {
  timeZone: PARAGUAY_TZ,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function SalesTable({ sales }: { sales: Sale[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (itemId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const filteredSales = useMemo(
    () =>
      sales.filter(
        (s) =>
          (!channelFilter || s.channel === channelFilter) &&
          (!statusFilter || s.status === statusFilter),
      ),
    [sales, channelFilter, statusFilter],
  );

  const rows = filteredSales.flatMap((sale) =>
    sale.items.map((item) => ({ sale, item })),
  );

  const totalVenta = rows.reduce((acc, r) => acc + lineTotal(r.item), 0);
  const totalGanancia = rows.reduce((acc, r) => acc + lineProfit(r.item), 0);
  const totalUnidades = rows.reduce((acc, r) => acc + r.item.quantity, 0);

  const handleDelete = async (sale: Sale) => {
    const aviso =
      sale.items.length > 1
        ? `Esta venta tiene ${sale.items.length} artículos: se eliminan todos juntos. Si descontaron stock, se repone automáticamente. ¿Eliminar?`
        : "¿Eliminar esta venta? Si descontó stock, se repone automáticamente.";
    if (!window.confirm(aviso)) return;
    setPendingId(sale.id);
    try {
      const res = await fetch(`/api/admin/sales/${sale.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar la venta.");
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          {filteredSales.length} venta{filteredSales.length !== 1 ? "s" : ""} ·{" "}
          {totalUnidades} artículo{totalUnidades !== 1 ? "s" : ""}
        </p>
        <select
          className="select"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          aria-label="Filtrar por canal"
        >
          <option value="">Todos los canales</option>
          {SALE_CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {SALE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="h3" style={{ fontSize: "0.9375rem" }}>
          Total {formatPrice(totalVenta)} · Ganancia {formatPrice(totalGanancia)}
        </p>
      </div>

      {sales.length === 0 ? (
        <div className="admin-empty">
          No hay ventas registradas en este rango de fechas.
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">Ninguna venta coincide con los filtros elegidos.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Fecha</th>
                <th>Cant.</th>
                <th>Precio compra</th>
                <th>Precio venta</th>
                <th>Ganancia</th>
                <th>Canal</th>
                <th>Estado</th>
                <th>Cliente</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ sale, item }) => {
                const deliveryBits = [
                  sale.customerPhone,
                  sale.destinationCity,
                  sale.shippingMethod === "otro" && sale.shippingMethodDetail
                    ? sale.shippingMethodDetail
                    : sale.shippingMethod
                      ? shippingMethodLabel(sale.shippingMethod)
                      : null,
                ].filter(Boolean);
                const isExpanded = expandedIds.has(item.id);
                return (
                <Fragment key={item.id}>
                <tr>
                  <td>
                    <div className="row gap-2" style={{ alignItems: "center" }}>
                      <button
                        type="button"
                        className="admin-table__expand-btn"
                        data-open={isExpanded ? "true" : "false"}
                        onClick={() => toggleExpanded(item.id)}
                        aria-label={isExpanded ? "Ocultar detalles" : "Ver detalles"}
                        aria-expanded={isExpanded}
                      >
                        <IconChevron className="icon--sm" />
                      </button>
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageVariant(item.imageUrl, "thumb")}
                          alt={item.name}
                          loading="lazy"
                          style={{
                            width: 36,
                            height: 44,
                            objectFit: "cover",
                            flexShrink: 0,
                            border: "1px solid var(--line)",
                          }}
                        />
                      ) : null}
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div className="meta">
                          Talla {item.size}
                          {item.note ? ` · ${item.note}` : ""}
                        </div>
                      </div>
                      {sale.customerNote ? (
                        <span
                          className="admin-table__note-flag"
                          title={`Nota: ${sale.customerNote}`}
                        >
                          <IconDocument className="icon--sm" />
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="meta" data-label="Fecha">
                    {dateTimeFormatter.format(new Date(sale.soldAt))}
                  </td>
                  <td data-label="Cant.">{item.quantity}</td>
                  <td data-label="Precio compra">{formatPrice(item.costPrice)}</td>
                  <td data-label="Precio venta">{formatPrice(item.unitPrice)}</td>
                  <td data-label="Ganancia">{formatPrice(lineProfit(item))}</td>
                  <td data-label="Canal">
                    <span className="meta">{channelLabel(sale.channel)}</span>
                  </td>
                  <td data-label="Estado">
                    <SaleStatusSelect
                      saleId={sale.id}
                      status={sale.status}
                      onChanged={() => router.refresh()}
                    />
                  </td>
                  <td data-label="Cliente">
                    {sale.customerName || deliveryBits.length > 0 ? (
                      <>
                        {sale.customerName ? (
                          sale.customerId ? (
                            <Link
                              href={`/gestion-ssjblue/clientes/${sale.customerId}`}
                              className="link-underline"
                            >
                              {sale.customerName}
                            </Link>
                          ) : (
                            <div>{sale.customerName}</div>
                          )
                        ) : null}
                        {deliveryBits.length > 0 ? (
                          <div className="meta">{deliveryBits.join(" · ")}</div>
                        ) : null}
                      </>
                    ) : (
                      <span className="meta">—</span>
                    )}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/gestion-ssjblue/ventas/${sale.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label="Eliminar venta"
                        title="Eliminar venta"
                        disabled={pendingId === sale.id}
                        onClick={() => handleDelete(sale)}
                      >
                        <IconTrash className="icon--sm" />
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr>
                    <td colSpan={10} className="admin-table__expand-panel">
                      <div className="row gap-4" style={{ flexWrap: "wrap" }}>
                        <div>
                          <span className="label">Vendedor</span>
                          <p className="meta">{sale.staffName || "—"}</p>
                        </div>
                        <div>
                          <span className="label">Nota</span>
                          <p className="meta">{sale.customerNote || "—"}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
