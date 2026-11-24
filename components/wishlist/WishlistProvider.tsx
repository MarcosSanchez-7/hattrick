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
import { buildCartItemsUrl, chunkSlugs } from "@/lib/cart-resolve";
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
  /** Cuántos de `slugs` siguen existiendo/visibles en el catálogo ahora
   * mismo -- Navbar lo usa para el badge en vez de recibir el catálogo
   * completo y filtrarlo ahí (ver Fase 3C). Arranca igual a `count` (no
   * hay parpadeo a 0 mientras se resuelve) y solo baja si se confirma que
   * algún favorito ya no está disponible; un error de red lo deja como
   * estaba, nunca lo fuerza a 0. */
  visibleCount: number;
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
  // Favoritos guardados que se confirmó que ya NO están visibles (ocultos
  // o eliminados) -- solo resta del conteo mostrado, nunca dispara que se
  // borren de `slugs`/localStorage (ver remove(), que sigue siendo 100%
  // manual, a pedido del cliente).
  const [unavailableSlugs, setUnavailableSlugs] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSlugs(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  }, [slugs, hydrated]);

  // Reconcilia el contador contra el catálogo real -- pide SOLO los slugs
  // guardados (reusa /api/catalog/cart-items, mismo contrato que ya
  // resuelve el carrito, ver lib/cart-resolve.ts) en vez de que Navbar
  // reciba el catálogo completo para filtrarlo él mismo (Fase 3C).
  // WishlistProvider vive en el layout compartido y no se remonta por
  // página, así que este efecto solo corre cuando la LISTA de favoritos
  // cambia de verdad (agregar/quitar), no en cada navegación.
  useEffect(() => {
    if (!hydrated) return;
    if (slugs.length === 0) {
      setUnavailableSlugs(new Set());
      return;
    }
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const chunks = chunkSlugs(slugs);
        const perChunk = await Promise.all(
          chunks.map(async (chunk) => {
            const res = await fetch(buildCartItemsUrl(chunk), { signal: controller.signal });
            if (!res.ok) throw new Error(`cart-items respondió ${res.status}`);
            const data = (await res.json()) as { products: { slug: string }[] };
            const foundSlugs = new Set(data.products.map((p) => p.slug));
            return chunk.filter((s) => !foundSlugs.has(s));
          }),
        );
        if (cancelled) return;
        setUnavailableSlugs(new Set(perChunk.flat()));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Error de red: no se toca nada -- ni slugs (ya garantizado) ni
        // unavailableSlugs (se conserva el último resultado confiable en
        // vez de asumir que todo sigue visible o que todo dejó de estarlo).
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
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

  const visibleCount = useMemo(
    () => slugs.filter((s) => !unavailableSlugs.has(s)).length,
    [slugs, unavailableSlugs],
  );

  // Toast compacto, mismo id fijo para agregar y quitar -- togglear rápido
  // reemplaza el toast anterior en vez de acumular uno por click.
  const value = useMemo<WishlistContextValue>(
    () => ({
      slugs,
      count: slugs.length,
      visibleCount,
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
    [slugs, visibleCount, hydrated, isSaved, toggle, remove],
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
