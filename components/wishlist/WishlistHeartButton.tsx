"use client";

import type { Product } from "@/lib/catalog";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { IconHeart } from "@/components/ui/Icons";

/**
 * Botón de corazón reutilizable (tarjeta de producto y ficha). Vive como
 * componente cliente aparte para no forzar "use client" en componentes que,
 * de otro modo, se renderizan en servidor (p. ej. ProductCard).
 */
export function WishlistHeartButton({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(product.slug);

  return (
    <button
      type="button"
      className={`wishlist-heart${className ? ` ${className}` : ""}`}
      data-saved={saved ? "true" : "false"}
      aria-pressed={saved}
      aria-label={saved ? "Quitar de favoritos" : "Guardar en favoritos"}
      title={saved ? "Quitar de favoritos" : "Guardar en favoritos"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
    >
      <IconHeart className="icon--sm" />
    </button>
  );
}
