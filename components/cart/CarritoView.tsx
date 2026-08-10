"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import {
  FREE_SHIPPING_FROM,
  availableStock,
  useCart,
  type CartLine,
} from "@/components/cart/CartProvider";
import { ProductVisual } from "@/components/product/ProductVisual";
import {
  IconBag,
  IconMinus,
  IconPlus,
  IconTrash,
  IconTruck,
  IconWhatsapp,
} from "@/components/ui/Icons";

function buildWhatsAppMessage(lines: CartLine[], total: number): string {
  const items = lines
    .map(
      (l) =>
        `• ${l.product.name} (Talla ${l.size}) x${l.qty} — ${formatPrice(l.lineTotal)}`,
    )
    .join("\n");
  return `¡Hola! Quiero comprar:\n${items}\n\nTotal: ${formatPrice(total)}`;
}

export function CarritoView({ whatsappNumber }: { whatsappNumber: string }) {
  const {
    lines,
    subtotal,
    shipping,
    total,
    count,
    setQty,
    remove,
    clear,
    hydrated,
  } = useCart();

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildWhatsAppMessage(lines, total))}`
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
              <div className="row" style={{ justifyContent: "space-between", marginTop: 24 }}>
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
                <span>{shipping === 0 ? "Gratis" : formatPrice(shipping)}</span>
              </div>
              <div className="totals__row totals__row--total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
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
            ) : (
              <p className="meta" style={{ textAlign: "center" }}>
                Escribinos por WhatsApp para coordinar tu compra.
              </p>
            )}

            <div className="stack gap-2">
              <div className="notice">
                <IconTruck className="icon--sm" />
                <span>
                  Envío gratuito a partir de {formatPrice(FREE_SHIPPING_FROM)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
