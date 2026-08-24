"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Clic directo en el botón = añadir sin salir de la página (nunca navega).
 * Cuando el producto lleva stock por talla y hace falta elegir cuál, en vez
 * de mandar al cliente a la ficha se abre un selector chiquito ahí mismo —
 * así puede seguir agregando varios productos sin perder el lugar. Abrir la
 * ficha queda reservado para tocar la foto del producto (el Link del card).
 */
export function QuickAddButton({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { add } = useCart();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; left: number } | null>(null);

  const soldOut = product.soldOut ?? [];
  const availableSizes = product.sizes.filter((s) => !soldOut.includes(s));
  const requiresSize = needsSizeSelection(product);
  const disabled = requiresSize && availableSizes.length === 0;

  useEffect(() => {
    if (!pickerAnchor) return;
    const close = () => setPickerAnchor(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerAnchor]);

  const addSize = (size: string) => {
    if (buttonRef.current) flyToCart(buttonRef.current);
    add(product, size, 1, { silent: true });
    setPickerAnchor(null);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`quick-add${className ? ` ${className}` : ""}`}
        aria-label="Añadir al carrito"
        title={disabled ? "Sin stock" : "Añadir al carrito"}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (requiresSize) {
            const rect = e.currentTarget.getBoundingClientRect();
            // El picker se centra en este punto (translateX(-50%)) y puede
            // llegar a 240px de ancho (ver .quick-add-picker en globals.css)
            // — en la columna derecha, centrarlo en el botón lo mandaba
            // fuera de la pantalla. Se acota para que siempre quede visible.
            const halfWidth = 120;
            const margin = 24;
            const center = rect.left + rect.width / 2;
            const left = Math.min(
              Math.max(center, halfWidth + margin),
              window.innerWidth - halfWidth - margin,
            );
            setPickerAnchor({ top: rect.top, left });
            return;
          }
          flyToCart(e.currentTarget);
          add(product, CONSULT_SIZE_LABEL, 1, { silent: true });
        }}
      >
        <IconBag className="icon--sm" />
      </button>

      {pickerAnchor ? (
        <>
          <button
            type="button"
            className="quick-add-picker__scrim"
            aria-label="Cerrar selector de talla"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPickerAnchor(null);
            }}
          />
          <div
            className="quick-add-picker"
            style={{ top: pickerAnchor.top, left: pickerAnchor.left }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <p className="quick-add-picker__title">Elegí la talla</p>
            <div className="sizes">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className="size"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addSize(size);
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
