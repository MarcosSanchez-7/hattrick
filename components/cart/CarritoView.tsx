"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import {
  FREE_SHIPPING_FROM,
  availableStock,
  useCart,
  type CartLine,
} from "@/components/cart/CartProvider";
import { ProductVisual } from "@/components/product/ProductVisual";
import { LocationPicker, type LatLng } from "@/components/admin/LocationPicker";
import {
  IconBag,
  IconMinus,
  IconPlus,
  IconTrash,
  IconTruck,
  IconWhatsapp,
} from "@/components/ui/Icons";

type InvoiceInfo = {
  wantsInvoice: boolean;
  razonSocial: string;
  ruc: string;
};

function buildWhatsAppMessage(
  lines: CartLine[],
  total: number,
  freeShipping: boolean,
  invoice: InvoiceInfo,
  location: LatLng,
): string {
  const items = lines
    .map((l) => {
      const base = `• ${l.product.name} (Talla ${l.size}) x${l.qty} — ${formatPrice(l.lineTotal)}`;
      const extras = [
        `   Ver producto: ${SITE_URL}/producto/${l.product.slug}`,
        l.note ? `   Personalizado: "${l.note}"` : null,
        l.patches?.length ? `   Parches: ${l.patches.map((p) => p.name).join(", ")}` : null,
      ].filter(Boolean);
      return `${base}\n${extras.join("\n")}`;
    })
    .join("\n");
  const locationLine = `Ubicación de entrega: https://www.google.com/maps?q=${location.lat},${location.lng}`;
  const shippingLine = freeShipping
    ? "Envío: gratis"
    : "Envío: a coordinar según la zona";
  const invoiceLine = invoice.wantsInvoice
    ? `\n\nFactura: sí\nRazón social: ${invoice.razonSocial}\nRUC: ${invoice.ruc}`
    : "";
  return `¡Hola! Quiero comprar:\n${items}\n\n${locationLine}\n${shippingLine}\nTotal: ${formatPrice(total)}${invoiceLine}`;
}

export function CarritoView({ whatsappNumber }: { whatsappNumber: string }) {
  const {
    lines,
    subtotal,
    freeShipping,
    total,
    count,
    setQty,
    remove,
    clear,
    hydrated,
  } = useCart();

  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [razonSocial, setRazonSocial] = useState("");
  const [ruc, setRuc] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);

  const invoiceComplete = razonSocial.trim() !== "" && ruc.trim() !== "";
  const canCheckout = location !== null && (!wantsInvoice || invoiceComplete);

  const whatsappHref =
    whatsappNumber && canCheckout
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          buildWhatsAppMessage(
            lines,
            total,
            freeShipping,
            {
              wantsInvoice,
              razonSocial: razonSocial.trim(),
              ruc: ruc.trim(),
            },
            location!,
          ),
        )}`
      : null;

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Carrito</span>
          </nav>
          <h1 className="h1">Tu carrito</h1>
          <p className="lead" style={{ marginTop: 8 }}>
            {hydrated
              ? count === 0
                ? "Todavía no has añadido ninguna camiseta."
                : `${count} artículo${count > 1 ? "s" : ""} listos para coordinar por WhatsApp.`
              : "Cargando…"}
          </p>
        </div>
      </header>

      {hydrated && lines.length === 0 ? (
        <div className="container">
          <div className="empty-state">
            <IconBag />
            <h2 className="h2">El carrito está vacío</h2>
            <p className="meta" style={{ maxWidth: "44ch" }}>
              Explora los nuevos ingresos o aprovecha las ofertas de la semana.
            </p>
            <div className="row gap-3">
              <Link href="/novedades" className="btn btn--sm">
                Ver novedades
              </Link>
              <Link href="/ofertas" className="btn btn--ghost btn--sm">
                Ver ofertas
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="container cart-page">
          <div>
            {lines.map((line) => {
              const max = availableStock(line.product, line.size);
              const atMax = max != null ? line.qty >= max : line.qty >= 10;
              return (
                <div
                  key={line.key}
                  className="line-item"
                  style={{ gridTemplateColumns: "110px 1fr" }}
                >
                  <div className="line-item__art">
                    <ProductVisual
                      images={line.product.images}
                      colors={line.product.colors}
                      pattern={line.product.pattern}
                      uid={`cart-${line.product.id}-${line.size}`}
                      alt={line.product.name}
                      size="thumb"
                    />
                  </div>
                  <div>
                    <div className="line-item__top">
                      <div>
                        <Link
                          href={`/producto/${line.product.slug}`}
                          style={{ fontWeight: 600 }}
                        >
                          {line.product.name}
                        </Link>
                        <div className="meta">Talla {line.size}</div>
                        {line.note ? (
                          <div className="meta">Personalizado: {line.note}</div>
                        ) : null}
                        {line.patches?.length ? (
                          <div className="meta">
                            Parches: {line.patches.map((p) => p.name).join(", ")}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.key)}
                        aria-label="Eliminar artículo"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        <IconTrash className="icon--sm" />
                      </button>
                    </div>
                    <div className="line-item__foot">
                      <div className="qty">
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty - 1)}
                          aria-label="Restar unidad"
                        >
                          <IconMinus className="icon--sm" />
                        </button>
                        <span className="qty__value">{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty + 1)}
                          disabled={atMax}
                          aria-label="Sumar unidad"
                        >
                          <IconPlus className="icon--sm" />
                        </button>
                      </div>
                      <span className="price">{formatPrice(line.lineTotal)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {lines.length > 0 ? (
              <div className="cart-actions-row">
                <Link href="/novedades" className="link-underline meta">
                  Seguir comprando
                </Link>
                <button type="button" className="link-underline meta" onClick={clear}>
                  Vaciar carrito
                </button>
              </div>
            ) : null}
          </div>

          <aside className="summary">
            <h2 className="label">Resumen del pedido</h2>
            <div className="totals">
              <div className="totals__row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="totals__row">
                <span>Envío</span>
                <span>
                  {freeShipping ? "Gratis" : "Costo adicional dependiendo la zona"}
                </span>
              </div>
              <div className="totals__row totals__row--total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <div className="stack gap-2">
              <label className="label">Ubicación de entrega (obligatorio)</label>
              <LocationPicker value={location} onChange={setLocation} height={220} />
            </div>

            <div className="invoice-toggle-row">
              <label className="invoice-toggle">
                <input
                  type="checkbox"
                  checked={wantsInvoice}
                  onChange={(e) => setWantsInvoice(e.target.checked)}
                />
                ¿Deseas factura?
              </label>

              {wantsInvoice ? (
                <div className="invoice-fields">
                  <div>
                    <label htmlFor="razonSocial">Razón social</label>
                    <input
                      id="razonSocial"
                      type="text"
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                  <div>
                    <label htmlFor="ruc">Número de RUC</label>
                    <input
                      id="ruc"
                      type="text"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value)}
                      placeholder="80012345-6"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--block"
              >
                <IconWhatsapp className="icon--sm" />
                Continuar por WhatsApp
              </a>
            ) : whatsappNumber && !location ? (
              <p className="meta" style={{ textAlign: "center" }}>
                Marcá tu ubicación en el mapa para continuar.
              </p>
            ) : whatsappNumber && !canCheckout ? (
              <p className="meta" style={{ textAlign: "center" }}>
                Completá razón social y RUC para continuar.
              </p>
            ) : (
              <p className="meta" style={{ textAlign: "center" }}>
                Escribinos por WhatsApp para coordinar tu compra.
              </p>
            )}

            <div className="stack gap-2">
              <div className="notice">
                <IconTruck className="icon--sm" />
                <span>
                  {freeShipping
                    ? `Envío gratuito a partir de ${formatPrice(FREE_SHIPPING_FROM)}`
                    : `Envío gratis desde ${formatPrice(FREE_SHIPPING_FROM)}. Por debajo de ese monto, nuestro asesor coordina el costo por WhatsApp según tu zona.`}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
