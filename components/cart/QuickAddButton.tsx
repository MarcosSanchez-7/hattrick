"use client";

import { useRouter } from "next/navigation";
import { CONSULT_SIZE_LABEL, needsSizeSelection, type Product } from "@/lib/catalog";
import { useCart } from "@/components/cart/CartProvider";
import { IconBag } from "@/components/ui/Icons";

/**
 * Atajo para añadir al carrito directo desde la tarjeta, sin entrar a la
 * ficha. Si el producto necesita elegir talla (stock propio), no hay forma
 * de saber cuál desde la grilla — en ese caso lleva a la ficha en vez de
 * adivinar una talla.
 */
export function QuickAddButton({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { add } = useCart();
  const router = useRouter();

  return (
    <button
      type="button"
      className={`quick-add${className ? ` ${className}` : ""}`}
      aria-label="Añadir al carrito"
      title="Añadir al carrito"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (needsSizeSelection(product)) {
          router.push(`/producto/${product.slug}`);
        } else {
          add(product, CONSULT_SIZE_LABEL);
        }
      }}
    >
      <IconBag className="icon--sm" />
    </button>
  );
}
