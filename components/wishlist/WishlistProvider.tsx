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
import { IconHeart } from "@/components/ui/Icons";

/** Un solo id fijo: togglear rápido (agregar/quitar seguido) actualiza el
 * mismo toast en vez de apilar uno nuevo por click. */
const WISHLIST_TOAST_ID = "wishlist-toast";

/** Fondo carbón + texto blanco vía las custom properties que sonner ya usa
 * internamente (--normal-bg/--normal-border/--normal-text, ver
 * node_modules/sonner/dist/styles.css) -- no hace falta un toast custom. */
const WISHLIST_TOAST_STYLE = {
  "--normal-bg": "#18181b",
  "--normal-border": "rgba(255, 255, 255, 0.08)",
  "--normal-text": "#ffffff",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
} as React.CSSProperties;

const wishlistToastIcon = (
  <span style={{ color: "#ef233c", display: "inline-flex" }}>
    <IconHeart filled className="icon--sm" />
  </span>
);

type WishlistContextValue = {
  slugs: string[];
  count: number;
  hydrated: boolean;
  isSaved: (slug: string) => boolean;
  /** Añade o quita según el estado actual; devuelve el nuevo estado ("added"/"removed"). */
  toggle: (product: PublicProduct) => "added" | "removed";
  remove: (slug: string) => void;
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

  const toggle = useCallback((product: PublicProduct): "added" | "removed" => {
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

  // Toast compacto, mismo id fijo para agregar y quitar -- togglear rápido
  // reemplaza el toast anterior en vez de acumular uno por click.
  const value = useMemo<WishlistContextValue>(
    () => ({
      slugs,
      count: slugs.length,
      hydrated,
      isSaved,
      toggle: (product: PublicProduct) => {
        const result = toggle(product);
        if (result === "added") {
          toast("Añadido a favoritos", {
            id: WISHLIST_TOAST_ID,
            description: `${product.name} se guardó en tu lista`,
            icon: wishlistToastIcon,
            duration: 3200,
            richColors: true,
            style: WISHLIST_TOAST_STYLE,
          });
        } else {
          toast("Eliminado de favoritos", {
            id: WISHLIST_TOAST_ID,
            // sonner actualiza el toast existente mezclando este objeto sobre
            // el anterior (mismo id) -- sin esto, la descripción del toast de
            // "Añadido" previo quedaría pegada acá.
            description: undefined,
            icon: wishlistToastIcon,
            duration: 3200,
            richColors: true,
            style: WISHLIST_TOAST_STYLE,
          });
        }
        return result;
      },
      remove,
    }),
    [slugs, hydrated, isSaved, toggle, remove],
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
