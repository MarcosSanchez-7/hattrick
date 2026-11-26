"use client";

import type { SharedCatalogProduct } from "@/lib/data";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { IconHeart } from "@/components/ui/Icons";

/**
 * Botón de corazón reutilizable (tarjeta de producto y ficha). Vive como
 * componente cliente aparte para no forzar "use client" en componentes que,
 * de otro modo, se renderizan en servidor (p. ej. ProductCard). Solo lee
 * `slug` -- tipado sobre SharedCatalogProduct (Fase 7B.5-B) en vez de
 * PublicProduct para aceptar tanto las tarjetas de listado como la ficha,
 * que sigue pasando su PublicProduct completo (superconjunto compatible).
 */
export function WishlistHeartButton({
  product,
  className,
}: {
  product: SharedCatalogProduct;
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
      <IconHeart filled={saved} />
    </button>
  );
}
