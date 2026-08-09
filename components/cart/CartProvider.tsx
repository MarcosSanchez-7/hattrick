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

export const FREE_SHIPPING_FROM = 640000;
export const SHIPPING_COST = 40000;

type StoredLine = { slug: string; size: string; qty: number };

export type CartLine = StoredLine & {
  key: string;
  product: Product;
  lineTotal: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  hydrated: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (
    product: Product,
    size: string,
    qty?: number,
    opts?: { silent?: boolean },
  ) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "hattrick.cart.v1";
const lineKey = (slug: string, size: string) => `${slug}::${size}`;

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
    (product: Product, size: string, qty = 1, opts?: { silent?: boolean }) => {
      setStored((prev) => {
        const idx = prev.findIndex(
          (l) => l.slug === product.slug && l.size === size,
        );
        if (idx === -1) return [...prev, { slug: product.slug, size, qty }];
        const next = [...prev];
        next[idx] = { ...next[idx], qty: Math.min(next[idx].qty + qty, 10) };
        return next;
      });
      if (!opts?.silent) setIsOpen(true);
    },
    [],
  );

  const setQty = useCallback((key: string, qty: number) => {
    setStored((prev) =>
      prev.flatMap((l) =>
        lineKey(l.slug, l.size) === key
          ? qty <= 0
            ? []
            : [{ ...l, qty: Math.min(qty, 10) }]
          : [l],
      ),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setStored((prev) => prev.filter((l) => lineKey(l.slug, l.size) !== key));
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
            key: lineKey(l.slug, l.size),
            product,
            lineTotal: product.price * l.qty,
          },
        ];
      }),
    [stored, products],
  );

  const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);
  const count = lines.reduce((acc, l) => acc + l.qty, 0);
  const shipping =
    subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;

  const value: CartContextValue = {
    lines,
    count,
    subtotal,
    shipping,
    total: subtotal + shipping,
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
