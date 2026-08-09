"use client";

import { useRouter } from "next/navigation";
import { CONSULT_SIZE_LABEL, needsSizeSelection, type Product } from "@/lib/catalog";
import { useCart } from "@/components/cart/CartProvider";
import { IconBag } from "@/components/ui/Icons";

/**
 * Anima una copia de la imagen del producto "volando" hacia el ícono del
 * carrito del navbar, sin navegar ni abrir el drawer — el cliente se queda
 * en la misma página para seguir comprando.
 */
function flyToCart(source: HTMLElement) {
  const target = document.getElementById("site-cart-button");
  const media = source.closest(".card__media")?.querySelector("img, svg");
  if (!target || !media) return;

  const startRect = media.getBoundingClientRect();
  const endRect = target.getBoundingClientRect();

  const clone = media.cloneNode(true) as HTMLElement;
  clone.classList.add("fly-to-cart");
  clone.style.width = `${startRect.width}px`;
  clone.style.height = `${startRect.height}px`;
  clone.style.left = `${startRect.left}px`;
  clone.style.top = `${startRect.top}px`;
  document.body.appendChild(clone);

  const dx = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
  const dy = endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);

  requestAnimationFrame(() => {
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.1)`;
    clone.style.opacity = "0.3";
  });

  setTimeout(() => clone.remove(), 550);
}

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
          return;
        }
        flyToCart(e.currentTarget);
        add(product, CONSULT_SIZE_LABEL, 1, { silent: true });
      }}
    >
      <IconBag className="icon--sm" />
    </button>
  );
}
