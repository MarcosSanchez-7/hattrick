"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CONSULT_SIZE_LABEL, needsSizeSelection } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconClose, IconHeart } from "@/components/ui/Icons";

const AUTO_DISMISS_MS = 6000;

/**
 * Aviso flotante que aparece al guardar un producto en favoritos, con
 * accesos directos para no perder el impulso de compra: seguir a la ficha
 * (o directo al carrito si no requiere talla) o seguir explorando.
 */
export function WishlistToast() {
  const { lastAdded, dismissLastAdded } = useWishlist();
  const { add } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(dismissLastAdded, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [lastAdded, dismissLastAdded]);

  if (!lastAdded) return null;
  const product = lastAdded;

  const buyNow = () => {
    dismissLastAdded();
    if (needsSizeSelection(product)) {
      router.push(`/producto/${product.slug}`);
    } else {
      add(product, CONSULT_SIZE_LABEL);
    }
  };

  return (
    <div className="wishlist-toast" role="status">
      <button
        type="button"
        className="wishlist-toast__close"
        onClick={dismissLastAdded}
        aria-label="Cerrar aviso"
      >
        <IconClose className="icon--sm" />
      </button>

      <div className="wishlist-toast__head">
        <IconHeart className="icon--sm" />
        <span>Añadido a favoritos</span>
      </div>

      <div className="wishlist-toast__product">
        <div className="wishlist-toast__art">
          <ProductVisual
            images={product.images}
            colors={product.colors}
            pattern={product.pattern}
            uid={`wtoast-${product.id}`}
            alt={`${product.team} — ${product.name}`}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="card__team">{product.team}</div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{product.name}</div>
          <div className="price" style={{ fontSize: "0.875rem" }}>
            {formatPrice(product.price)}
          </div>
        </div>
      </div>

      <div className="wishlist-toast__actions">
        <button type="button" className="btn btn--sm btn--block" onClick={buyNow}>
          Comprar ya
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--block"
          onClick={dismissLastAdded}
        >
          Seguir comprando
        </button>
      </div>
    </div>
  );
}
