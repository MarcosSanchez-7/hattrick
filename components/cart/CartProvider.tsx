"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import type { PublicProduct } from "@/lib/data";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";
import { IconBag } from "@/components/ui/Icons";

export const FREE_SHIPPING_FROM = 650000;

/** Un solo id fijo: agregar/quitar seguido actualiza el mismo toast en vez
 * de apilar uno nuevo por click (mismo patrón que WISHLIST_TOAST_ID en
 * WishlistProvider.tsx). */
const CART_TOAST_ID = "cart-toast";

const CART_TOAST_STYLE = {
  "--normal-bg": "#18181b",
  "--normal-border": "rgba(255, 255, 255, 0.08)",
  "--normal-text": "#ffffff",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
} as React.CSSProperties;

const cartToastIcon = <IconBag className="icon--sm" />;

/** Parche elegido, guardado como snapshot liviano (nombre+precio) — evita
 * tener que resolver el catálogo de parches de nuevo en cada lugar que lee
 * el carrito (drawer, /carrito, mensaje de WhatsApp). */
export type CartPatch = { name: string; price: number };

type StoredLine = {
  slug: string;
  size: string;
  qty: number;
  /** Texto "Nombre #Número" si el cliente pidió personalización. */
  note?: string | null;
  patches?: CartPatch[] | null;
  /** Recargo por unidad (personalización + parches), ya resuelto al agregar
   * — el carrito no necesita saber el precio de personalización vigente. */
  addOnsPerUnit?: number;
};

export type CartLine = StoredLine & {
  key: string;
  product: PublicProduct;
  lineTotal: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** Envío gratis si el subtotal llega al mínimo; si no, el costo lo cierra el asesor por WhatsApp según la zona. */
  freeShipping: boolean;
  total: number;
  hydrated: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (
    product: PublicProduct,
    size: string,
    qty?: number,
    opts?: {
      silent?: boolean;
      note?: string | null;
      patches?: CartPatch[];
      /** Recargo por unidad ya calculado (personalización + parches). */
      addOnsPerUnit?: number;
    },
  ) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "hattrick.cart.v1";

/** Dos líneas del mismo producto/talla pero con personalización o parches
 * distintos no deben mezclarse — se incluyen en la key para diferenciarlas. */
function lineKey(
  slug: string,
  size: string,
  note?: string | null,
  patches?: CartPatch[] | null,
): string {
  const patchPart = (patches ?? [])
    .map((p) => p.name)
    .sort()
    .join(",");
  return `${slug}::${size}::${note ?? ""}::${patchPart}`;
}

/** Tope de unidades por talla cuando no se expone el stock real (ver
 * PublicProduct.variants en lib/data.ts): no es un límite de inventario
 * real, es solo una ayuda de UX para que el cliente no pida una cantidad
 * absurda por WhatsApp -- la venta real se valida a mano con el stock
 * exacto en el panel (SaleForm), este número nunca fue una barrera de
 * integridad de datos. */
const MAX_CART_QTY = 10;

/** Tope de unidades para esa talla: 0 si está agotada, MAX_CART_QTY si hay
 * disponibilidad (sin revelar cuánto queda realmente), o null si el
 * producto no lleva stock propio (ajeno/importado, "Consultar talle"). */
export function availableStock(product: PublicProduct, size: string): number | null {
  const variant = product.variants?.find((v) => v.size === size);
  if (!variant) return null;
  return variant.inStock ? MAX_CART_QTY : 0;
}

/** Aviso cuando se pide más que el tope por talla. Sin revelar el stock
 * real: si la talla sigue disponible, un aviso de urgencia genérico; si
 * está agotada (max === 0), no hace falta aviso aparte -- sizes/soldOut ya
 * la muestra como "Agotado" en la ficha/tarjeta. */
function stockWarningFor(size: string, max: number): string | null {
  if (max <= 0) return null;
  return `¡Últimas unidades disponibles de la talla ${size}!`;
}

function readStorage(): StoredLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is StoredLine =>
        !!l &&
        typeof (l as StoredLine).slug === "string" &&
        typeof (l as StoredLine).size === "string" &&
        Number.isFinite((l as StoredLine).qty),
    );
  } catch {
    return [];
  }
}

export function CartProvider({
  children,
  products,
}: {
  children: React.ReactNode;
  products: PublicProduct[];
}) {
  const [stored, setStored] = useState<StoredLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setStored(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [stored, hydrated]);

  // Bloquea el scroll del documento mientras el drawer está abierto.
  useEffect(() => {
    document.body.dataset.scrollLocked = isOpen ? "true" : "false";
    return () => {
      document.body.dataset.scrollLocked = "false";
    };
  }, [isOpen]);

  const add = useCallback(
    (
      product: PublicProduct,
      size: string,
      qty = 1,
      opts?: {
        silent?: boolean;
        note?: string | null;
        patches?: CartPatch[];
        addOnsPerUnit?: number;
      },
    ) => {
      const max = availableStock(product, size);
      const note = opts?.note ?? null;
      const patches = opts?.patches ?? null;
      const key = lineKey(product.slug, size, note, patches);
      let added = false;
      setStored((prev) => {
        const idx = prev.findIndex(
          (l) => lineKey(l.slug, l.size, l.note, l.patches) === key,
        );
        const currentQty = idx === -1 ? 0 : prev[idx].qty;
        const requested = currentQty + qty;
        const capped = max != null ? Math.min(requested, max) : Math.min(requested, MAX_CART_QTY);
        added = capped > currentQty;

        if (max != null && requested > max) {
          const warning = stockWarningFor(size, max);
          if (warning) toast.warning(warning);
        }

        if (idx === -1) {
          if (capped <= 0) return prev;
          return [
            ...prev,
            {
              slug: product.slug,
              size,
              qty: capped,
              note,
              patches,
              addOnsPerUnit: opts?.addOnsPerUnit ?? 0,
            },
          ];
        }
        const next = [...prev];
        next[idx] = { ...next[idx], qty: capped };
        return next;
      });
      trackPixelEvent("AddToCart", {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        value: product.price * qty,
        currency: "PYG",
      });
      if (added) {
        toast("Añadido al carrito", {
          id: CART_TOAST_ID,
          description: `${product.name} se agregó a tu carrito`,
          icon: cartToastIcon,
          duration: 3200,
          richColors: true,
          style: CART_TOAST_STYLE,
        });
      }
      if (!opts?.silent) setIsOpen(true);
    },
    [],
  );

  const setQty = useCallback(
    (key: string, qty: number) => {
      setStored((prev) =>
        prev.flatMap((l) => {
          if (lineKey(l.slug, l.size, l.note, l.patches) !== key) return [l];
          if (qty <= 0) return [];
          const product = products.find((p) => p.slug === l.slug);
          const max = product ? availableStock(product, l.size) : null;
          const capped = max != null ? Math.min(qty, max) : Math.min(qty, MAX_CART_QTY);
          if (max != null && qty > max) {
            const warning = stockWarningFor(l.size, max);
            if (warning) toast.warning(warning);
          }
          return [{ ...l, qty: capped }];
        }),
      );
    },
    [products],
  );

  const remove = useCallback(
    (key: string) => {
      let removedProduct: PublicProduct | undefined;
      setStored((prev) => {
        const line = prev.find(
          (l) => lineKey(l.slug, l.size, l.note, l.patches) === key,
        );
        if (line) removedProduct = products.find((p) => p.slug === line.slug);
        return prev.filter(
          (l) => lineKey(l.slug, l.size, l.note, l.patches) !== key,
        );
      });
      if (removedProduct) {
        toast("Producto eliminado", {
          id: CART_TOAST_ID,
          description: `${removedProduct.name} se quitó del carrito`,
          icon: cartToastIcon,
          duration: 3200,
          richColors: true,
          style: CART_TOAST_STYLE,
        });
      }
    },
    [products],
  );

  const clear = useCallback(() => setStored([]), []);

  const lines = useMemo<CartLine[]>(
    () =>
      stored.flatMap((l) => {
        const product = products.find((p) => p.slug === l.slug);
        if (!product) return [];
        return [
          {
            ...l,
            key: lineKey(l.slug, l.size, l.note, l.patches),
            product,
            lineTotal: (product.price + (l.addOnsPerUnit ?? 0)) * l.qty,
          },
        ];
      }),
    [stored, products],
  );

  const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);
  const count = lines.reduce((acc, l) => acc + l.qty, 0);
  const freeShipping = subtotal > 0 && subtotal >= FREE_SHIPPING_FROM;

  const value: CartContextValue = {
    lines,
    count,
    subtotal,
    freeShipping,
    // El costo de envío todavía no está automatizado: si no llega al
    // mínimo para envío gratis, el asesor lo cierra por WhatsApp según la
    // zona — no se suma ningún monto fijo al total.
    total: subtotal,
    hydrated,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    add,
    setQty,
    remove,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
