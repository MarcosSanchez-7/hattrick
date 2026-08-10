"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { IconClose } from "@/components/ui/Icons";

const AUTO_DISMISS_MS = 5000;

export function CartStockToast() {
  const { stockWarning, dismissStockWarning } = useCart();

  useEffect(() => {
    if (!stockWarning) return;
    const timer = setTimeout(dismissStockWarning, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [stockWarning, dismissStockWarning]);

  if (!stockWarning) return null;

  return (
    <div className="stock-toast" role="status">
      <span>{stockWarning}</span>
      <button
        type="button"
        className="stock-toast__close"
        onClick={dismissStockWarning}
        aria-label="Cerrar aviso"
      >
        <IconClose className="icon--sm" />
      </button>
    </div>
  );
}
