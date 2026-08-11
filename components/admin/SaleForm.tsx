"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SALE_CHANNELS, type Product, type SaleChannel } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { IconClose, IconSearch } from "@/components/ui/Icons";

type TicketLine = {
  variantId: string;
  productId: string;
  name: string;
  size: string;
  maxStock: number;
  quantity: number;
  unitPrice: string;
  costPrice: string;
};

function matches(product: Product, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return product.name.toLowerCase().includes(q);
}

export function SaleForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [channel, setChannel] = useState<SaleChannel>("store");
  const [staffName, setStaffName] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return products.filter((p) => matches(p, query)).slice(0, 8);
  }, [products, query]);

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
          variantId: variant.id,
          productId: product.id,
          name: product.name,
          size: variant.size,
          maxStock: variant.stock,
          quantity: 1,
          unitPrice: String(product.price),
          costPrice: product.costPrice != null ? String(product.costPrice) : "0",
        },
      ];
    });
    setQuery("");
  };

  const updateLine = <K extends keyof TicketLine>(
    variantId: string,
    key: K,
    value: TicketLine[K],
  ) => {
    setLines((prev) =>
      prev.map((l) => (l.variantId === variantId ? { ...l, [key]: value } : l)),
    );
  };

  const removeLine = (variantId: string) => {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
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
          items: lines.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
            unitPrice: Number(l.unitPrice) || 0,
            costPrice: Number(l.costPrice) || 0,
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
            {results.map((product) => (
              <div key={product.id} className="admin-sale-result">
                <div>
                  <div style={{ fontWeight: 600 }}>{product.name}</div>
                  <div className="meta">{formatPrice(product.price)}</div>
                </div>
                <div className="admin-checklist">
                  {(product.variants ?? []).map((variant) => (
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : query.trim() ? (
          <p className="admin-help">Sin resultados para «{query}».</p>
        ) : (
          <p className="admin-help">
            Solo aparecen productos con stock propio cargado.
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
                    <tr key={l.variantId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.name}</div>
                        <div className="meta">Talla {l.size}</div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          max={l.maxStock}
                          value={l.quantity}
                          className="admin-variant-qty"
                          style={{ width: 70 }}
                          onChange={(e) =>
                            updateLine(
                              l.variantId,
                              "quantity",
                              Math.max(
                                1,
                                Math.min(l.maxStock, Number(e.target.value) || 1),
                              ),
                            )
                          }
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
                            updateLine(l.variantId, "unitPrice", e.target.value)
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
                            updateLine(l.variantId, "costPrice", e.target.value)
                          }
                        />
                      </td>
                      <td>{formatPrice(lineProfit)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-label="Quitar artículo"
                          onClick={() => removeLine(l.variantId)}
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
              placeholder="Cliente, referencia, etc."
            />
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
