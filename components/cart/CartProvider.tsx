"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/lib/catalog";

export const FREE_SHIPPING_FROM = 650000;

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
  product: Product;
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
    product: Product,
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
  /** Mensaje cuando se pidió más cantidad de la que hay en stock real. */
  stockWarning: string | null;
  dismissStockWarning: () => void;
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

/** Stock real disponible para esa talla, o null si no llevamos cantidad (ajeno/importado). */
export function availableStock(product: Product, size: string): number | null {
  if (product.stockMode !== "propio") return null;
  const variant = product.variants?.find((v) => v.size === size);
  return variant ? variant.stock : null;
}

function stockMessage(size: string, remaining: number): string {
  if (remaining <= 0) return `No queda stock disponible de la talla ${size}.`;
  const unidad = remaining === 1 ? "unidad" : "unidades";
  const disponible = remaining === 1 ? "disponible" : "disponibles";
  return `Solo ${remaining === 1 ? "queda" : "quedan"} ${remaining} ${unidad} ${disponible} de la talla ${size}.`;
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
  products: Product[];
}) {
  const [stored, setStored] = useState<StoredLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

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
      product: Product,
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
      setStored((prev) => {
        const idx = prev.findIndex(
          (l) => lineKey(l.slug, l.size, l.note, l.patches) === key,
        );
        const currentQty = idx === -1 ? 0 : prev[idx].qty;
        const requested = currentQty + qty;
        const capped = max != null ? Math.min(requested, max) : Math.min(requested, 10);

        if (max != null && requested > max) {
          setStockWarning(stockMessage(size, capped));
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
          const capped = max != null ? Math.min(qty, max) : Math.min(qty, 10);
          if (max != null && qty > max) {
            setStockWarning(stockMessage(l.size, capped));
          }
          return [{ ...l, qty: capped }];
        }),
      );
    },
    [products],
  );

  const dismissStockWarning = useCallback(() => setStockWarning(null), []);

  const remove = useCallback((key: string) => {
    setStored((prev) =>
      prev.filter((l) => lineKey(l.slug, l.size, l.note, l.patches) !== key),
    );
  }, []);

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
    stockWarning,
    dismissStockWarning,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
