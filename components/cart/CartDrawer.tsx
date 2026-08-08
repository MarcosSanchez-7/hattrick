"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import {
  FREE_SHIPPING_FROM,
  useCart,
  type CartLine,
} from "@/components/cart/CartProvider";
import { ProductVisual } from "@/components/product/ProductVisual";
import {
  IconBag,
  IconClose,
  IconMinus,
  IconPlus,
  IconTrash,
  IconTruck,
} from "@/components/ui/Icons";

export function CartDrawer() {
  const { isOpen, closeCart, lines, subtotal, shipping, total, count } =
    useCart();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeCart]);

  if (!isOpen) return null;

  const missing = Math.max(0, FREE_SHIPPING_FROM - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_FROM) * 100);

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Carrito">
      <button
        className="drawer__scrim"
        onClick={closeCart}
        aria-label="Cerrar carrito"
        tabIndex={-1}
      />
      <div className="drawer__panel">
        <div className="drawer__head">
          <p className="label">Carrito ({count})</p>
          <button
            type="button"
            className="nav__icon-btn"
            onClick={closeCart}
            aria-label="Cerrar carrito"
          >
            <IconClose />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="drawer__body">
            <div className="drawer__empty">
              <IconBag />
              <p className="h3">Tu carrito está vacío</p>
              <p className="meta" style={{ maxWidth: "32ch" }}>
                Añade una camiseta y la verás aquí. El envío es gratis a partir
                de {formatPrice(FREE_SHIPPING_FROM)}.
              </p>
              <Link href="/novedades" className="btn btn--sm" onClick={closeCart}>
                Ver novedades
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 24px 0" }}>
              <div className="row gap-3" style={{ marginBottom: 8 }}>
                <IconTruck className="icon--sm" />
                <span className="meta">
                  {missing > 0
                    ? `Te faltan ${formatPrice(missing)} para el envío gratis`
                    : "Envío gratuito conseguido"}
                </span>
              </div>
              <div className="progress">
                <div className="progress__bar" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="drawer__body">
              {lines.map((line) => (
                <DrawerLine key={line.key} line={line} />
              ))}
            </div>

            <div className="drawer__foot">
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
              <Link href="/carrito" className="btn btn--block" onClick={closeCart}>
                Finalizar compra
              </Link>
              <button
                type="button"
                className="btn btn--ghost btn--sm btn--block"
                onClick={closeCart}
              >
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DrawerLine({ line }: { line: CartLine }) {
  const { setQty, remove, closeCart } = useCart();
  const { product } = line;

  return (
    <div className="line-item">
      <div className="line-item__art">
        <ProductVisual
          images={product.images}
          colors={product.colors}
          pattern={product.pattern}
          uid={`d-${product.id}-${line.size}`}
          alt={`${product.team} — ${product.name}`}
        />
      </div>
      <div>
        <div className="line-item__top">
          <div>
            <div className="card__team">{product.team}</div>
            <Link
              href={`/producto/${product.slug}`}
              onClick={closeCart}
              style={{ fontWeight: 600, fontSize: "0.9375rem" }}
            >
              {product.name}
            </Link>
            <div className="meta">Talla {line.size}</div>
          </div>
          <button
            type="button"
            onClick={() => remove(line.key)}
            aria-label="Eliminar del carrito"
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
              disabled={line.qty >= 10}
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
}
