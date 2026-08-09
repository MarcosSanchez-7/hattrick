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

type WishlistContextValue = {
  slugs: string[];
  count: number;
  hydrated: boolean;
  isSaved: (slug: string) => boolean;
  /** Añade o quita según el estado actual; devuelve el nuevo estado ("added"/"removed"). */
  toggle: (product: Product) => "added" | "removed";
  remove: (slug: string) => void;
  /** Último producto añadido (no al quitar) — dispara el aviso con accesos directos. */
  lastAdded: Product | null;
  dismissLastAdded: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

const STORAGE_KEY = "hattrick.wishlist.v1";

function readStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastAdded, setLastAdded] = useState<Product | null>(null);

  useEffect(() => {
    setSlugs(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  }, [slugs, hydrated]);

  const isSaved = useCallback(
    (slug: string) => slugs.includes(slug),
    [slugs],
  );

  const toggle = useCallback((product: Product): "added" | "removed" => {
    let result: "added" | "removed" = "added";
    setSlugs((prev) => {
      if (prev.includes(product.slug)) {
        result = "removed";
        return prev.filter((s) => s !== product.slug);
      }
      result = "added";
      return [...prev, product.slug];
    });
    return result;
  }, []);

  const remove = useCallback((slug: string) => {
    setSlugs((prev) => prev.filter((s) => s !== slug));
  }, []);

  const dismissLastAdded = useCallback(() => setLastAdded(null), []);

  // toggle() no puede fijar lastAdded directamente porque su resultado depende
  // del setSlugs funcional; los componentes que llaman a toggle deciden si
  // mostrar el aviso comprobando el resultado devuelto y llamando a esto.
  const value = useMemo<WishlistContextValue>(
    () => ({
      slugs,
      count: slugs.length,
      hydrated,
      isSaved,
      toggle: (product: Product) => {
        const result = toggle(product);
        if (result === "added") setLastAdded(product);
        else if (lastAdded?.slug === product.slug) setLastAdded(null);
        return result;
      },
      remove,
      lastAdded,
      dismissLastAdded,
    }),
    [slugs, hydrated, isSaved, toggle, remove, lastAdded, dismissLastAdded],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist debe usarse dentro de <WishlistProvider>");
  return ctx;
}
