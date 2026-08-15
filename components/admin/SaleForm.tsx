"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  normalizePhone,
  SALE_CHANNELS,
  SHIPPING_METHODS,
  type Product,
  type SaleChannel,
  type ShippingMethod,
} from "@/lib/catalog";
import type { Customer } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { IconClose, IconPlus, IconSearch } from "@/components/ui/Icons";

type TicketLine = {
  /** Clave única de la línea: el id de la variante para stock propio, o un id generado para dropshipping. */
  key: string;
  /** Presente = stock propio (descuenta del inventario). Ausente = dropshipping. */
  variantId: string | null;
  productId: string;
  name: string;
  size: string;
  /** null = sin tope (dropshipping, no hay stock que controlar). */
  maxStock: number | null;
  quantity: number;
  unitPrice: string;
  costPrice: string;
  /** Personalización, parches u otro detalle de este artículo puntual. */
  itemNote: string;
};

function matches(product: Product, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return product.name.toLowerCase().includes(q);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Los productos dropshipping (ajeno/importado) no tienen `sizes` cargado —
 * se calcula solo desde product_variants, que no existen para ellos (no
 * llevamos stock por talla). Por eso acá se escribe la talla a mano en vez
 * de elegirla de una lista, a diferencia del flujo de stock propio.
 */
function DropshippingSizeInput({ onAdd }: { onAdd: (size: string) => void }) {
  const [size, setSize] = useState("");

  const submit = () => {
    const trimmed = size.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setSize("");
  };

  return (
    <div className="row gap-2" style={{ alignItems: "center" }}>
      <input
        type="text"
        value={size}
        onChange={(e) => setSize(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Talla (ej. M)"
        aria-label="Talla"
        style={{ width: 120 }}
      />
      <button
        type="button"
        className="admin-icon-btn"
        aria-label="Agregar artículo"
        title="Agregar artículo"
        onClick={submit}
      >
        <IconPlus className="icon--sm" />
      </button>
    </div>
  );
}

export function SaleForm({
  products,
  customers,
}: {
  products: Product[];
  customers: Customer[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [channel, setChannel] = useState<SaleChannel>("store");
  const [staffName, setStaffName] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | "">("");
  const [shippingMethodDetail, setShippingMethodDetail] = useState("");
  const [soldAt, setSoldAt] = useState(todayStr());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return products.filter((p) => matches(p, query)).slice(0, 8);
  }, [products, query]);

  // Solo informativo: el aviso ayuda a confirmar que la venta se va a
  // vincular al cliente correcto. La resolución real (crear o vincular)
  // la hace el servidor al registrar, con la misma normalización.
  const matchedCustomer = useMemo(() => {
    const normalized = normalizePhone(customerPhone);
    if (!normalized) return null;
    return (
      customers.find((c) => c.phone && normalizePhone(c.phone) === normalized) ?? null
    );
  }, [customers, customerPhone]);

  const addLine = (product: Product, variant: NonNullable<Product["variants"]>[number]) => {
    if (variant.stock <= 0) return;
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.variantId === variant.id);
      if (idx >= 0) {
        const next = [...prev];
        const line = next[idx];
        const quantity = Math.min(line.quantity + 1, variant.stock);
        next[idx] = { ...line, quantity };
        return next;
      }
      return [
        ...prev,
        {
          key: variant.id,
          variantId: variant.id,
          productId: product.id,
          name: product.name,
          size: variant.size,
          maxStock: variant.stock,
          quantity: 1,
          unitPrice: String(product.price),
          costPrice: product.costPrice != null ? String(product.costPrice) : "0",
          itemNote: "",
        },
      ];
    });
    setQuery("");
  };

  const addDropshippingLine = (product: Product, size: string) => {
    setLines((prev) => {
      const idx = prev.findIndex(
        (l) => l.variantId === null && l.productId === product.id && l.size === size,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          variantId: null,
          productId: product.id,
          name: product.name,
          size,
          maxStock: null,
          quantity: 1,
          unitPrice: String(product.price),
          costPrice: product.costPrice != null ? String(product.costPrice) : "0",
          itemNote: "",
        },
      ];
    });
    setQuery("");
  };

  const updateLine = <K extends keyof TicketLine>(
    key: string,
    field: K,
    value: TicketLine[K],
  ) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const total = lines.reduce(
    (acc, l) => acc + (Number(l.unitPrice) || 0) * l.quantity,
    0,
  );
  const profit = lines.reduce(
    (acc, l) =>
      acc + ((Number(l.unitPrice) || 0) - (Number(l.costPrice) || 0)) * l.quantity,
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lines.length === 0) {
      setError("Agrega al menos un artículo a la venta.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          staffName: staffName.trim() || null,
          customerNote: customerNote.trim() || null,
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
          destinationCity: destinationCity.trim() || null,
          shippingMethod: shippingMethod || null,
          shippingMethodDetail:
            shippingMethod === "otro" ? shippingMethodDetail.trim() || null : null,
          // Si no se tocó la fecha, no se manda: la venta queda con la hora
          // exacta de ahora en vez de quedar fija al mediodía.
          soldAt: soldAt === todayStr() ? null : `${soldAt}T12:00:00`,
          items: lines.map((l) => ({
            variantId: l.variantId,
            productId: l.productId,
            productName: l.variantId ? null : l.name,
            size: l.variantId ? null : l.size,
            quantity: l.quantity,
            unitPrice: Number(l.unitPrice) || 0,
            costPrice: Number(l.costPrice) || 0,
            itemNote: l.itemNote.trim() || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo registrar la venta.");
      router.push("/gestion-ssjblue/ventas");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Buscar producto</p>
        <div className="admin-field">
          <label htmlFor="sale-search" className="sr-only">
            Buscar por nombre
          </label>
          <div className="row gap-2">
            <span style={{ flex: "none", display: "flex" }}>
              <IconSearch className="icon--sm" />
            </span>
            <input
              id="sale-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe el equipo o el nombre del producto…"
              style={{
                flex: 1,
                border: "1px solid var(--line)",
                padding: "10px 12px",
                fontSize: "0.9375rem",
              }}
            />
          </div>
        </div>

        {results.length > 0 ? (
          <div className="admin-sale-results">
            {results.map((product) => {
              const isDropshipping = product.stockMode !== "propio";
              return (
                <div key={product.id} className="admin-sale-result">
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div className="meta">
                      {formatPrice(product.price)}
                      {isDropshipping ? " · Dropshipping, sin stock propio" : ""}
                    </div>
                  </div>
                  <div className={isDropshipping ? undefined : "admin-checklist"}>
                    {isDropshipping ? (
                      <DropshippingSizeInput
                        onAdd={(size) => addDropshippingLine(product, size)}
                      />
                    ) : (
                      (product.variants ?? []).map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          className="admin-check"
                          disabled={variant.stock <= 0}
                          onClick={() => addLine(product, variant)}
                          title={
                            variant.stock <= 0
                              ? "Sin stock"
                              : `Agregar talla ${variant.size}`
                          }
                        >
                          {variant.size} ({variant.stock})
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : query.trim() ? (
          <p className="admin-help">Sin resultados para «{query}».</p>
        ) : (
          <p className="admin-help">
            Los productos de stock propio muestran las tallas con cantidad
            disponible. Los de dropshipping no descuentan stock, solo suman
            la ganancia.
          </p>
        )}
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Artículos de esta venta</p>
        {lines.length === 0 ? (
          <p className="admin-help">Todavía no agregaste ningún artículo.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th>Detalle</th>
                  <th>Cant.</th>
                  <th>Precio venta</th>
                  <th>Precio costo</th>
                  <th>Ganancia</th>
                  <th aria-label="Quitar" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const lineProfit =
                    ((Number(l.unitPrice) || 0) - (Number(l.costPrice) || 0)) *
                    l.quantity;
                  return (
                    <tr key={l.key}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.name}</div>
                        <div className="meta">
                          Talla {l.size}
                          {l.variantId === null ? " · Dropshipping" : ""}
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={l.itemNote}
                          className="admin-variant-qty"
                          style={{ width: 140 }}
                          placeholder="Personalizado, parches…"
                          onChange={(e) => updateLine(l.key, "itemNote", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          max={l.maxStock ?? undefined}
                          value={l.quantity}
                          className="admin-variant-qty"
                          style={{ width: 70 }}
                          onChange={(e) => {
                            const raw = Number(e.target.value) || 1;
                            const quantity =
                              l.maxStock != null
                                ? Math.max(1, Math.min(l.maxStock, raw))
                                : Math.max(1, raw);
                            updateLine(l.key, "quantity", quantity);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={l.unitPrice}
                          className="admin-variant-qty"
                          onChange={(e) =>
                            updateLine(l.key, "unitPrice", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={l.costPrice}
                          className="admin-variant-qty"
                          onChange={(e) =>
                            updateLine(l.key, "costPrice", e.target.value)
                          }
                        />
                      </td>
                      <td>{formatPrice(lineProfit)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-label="Quitar artículo"
                          onClick={() => removeLine(l.key)}
                        >
                          <IconClose className="icon--sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {lines.length > 0 ? (
          <div className="totals" style={{ maxWidth: 320, marginLeft: "auto" }}>
            <div className="totals__row">
              <span>Total venta</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="totals__row totals__row--total">
              <span>Ganancia</span>
              <span>{formatPrice(profit)}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Detalles de la venta</p>
        <div className="admin-form__grid admin-form__grid--3">
          <div className="admin-field">
            <label htmlFor="channel">Canal de venta</label>
            <select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as SaleChannel)}
            >
              {SALE_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="soldAt">Fecha de venta</label>
            <input
              id="soldAt"
              type="date"
              value={soldAt}
              max={todayStr()}
              onChange={(e) => setSoldAt(e.target.value || todayStr())}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="staffName">Vendedor/a (opcional)</label>
            <input
              id="staffName"
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Nombre de quien vende"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="customerNote">Nota (opcional)</label>
            <input
              id="customerNote"
              type="text"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Referencia, aclaración, etc."
            />
          </div>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Entrega (opcional)</p>
        <p className="admin-help">
          Para tener panorama de cómo se mueven los artículos: quién lo pidió,
          adónde y por qué medio.
        </p>
        <div className="admin-form__grid admin-form__grid--3">
          <div className="admin-field">
            <label htmlFor="customerName">Nombre del cliente</label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre y apellido"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="customerPhone">Teléfono del cliente</label>
            <input
              id="customerPhone"
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="09xx xxx xxx"
            />
            {matchedCustomer ? (
              <p className="admin-help" style={{ color: "var(--ink)" }}>
                Cliente ya cargado: {matchedCustomer.name}. Esta venta se
                suma a su historial.
              </p>
            ) : customerPhone.trim() ? (
              <p className="admin-help">
                Cliente nuevo — se crea solo al registrar la venta.
              </p>
            ) : null}
          </div>
          <div className="admin-field">
            <label htmlFor="destinationCity">Ciudad de destino</label>
            <input
              id="destinationCity"
              type="text"
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              placeholder="Asunción, Ciudad del Este, etc."
            />
          </div>
          <div className="admin-field">
            <label htmlFor="shippingMethod">Método de envío</label>
            <select
              id="shippingMethod"
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value as ShippingMethod | "")}
            >
              <option value="">Sin especificar</option>
              {SHIPPING_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            {shippingMethod === "otro" ? (
              <input
                type="text"
                value={shippingMethodDetail}
                onChange={(e) => setShippingMethodDetail(e.target.value)}
                placeholder="Ej: envío directo desde el proveedor en China"
                style={{ marginTop: 8 }}
                aria-label="Aclaración del método de envío"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/ventas")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : "Registrar venta"}
        </button>
      </div>
    </form>
  );
}
