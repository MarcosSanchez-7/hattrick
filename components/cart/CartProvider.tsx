"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { SharedCatalogProduct } from "@/lib/data";
import { acceptFreshSlugs, buildCartItemsUrl, chunkSlugs } from "@/lib/cart-resolve";
import {
  availableStock,
  cartReducer,
  deriveCartLines,
  initialCartState,
  type CartLine,
  type CartPatch,
  type StoredLine,
} from "@/lib/cart-reducer";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";
import { IconBag } from "@/components/ui/Icons";

export { availableStock, deriveCartLines, type CartLine, type CartPatch, type StoredLine };

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

export type RefreshResult =
  | { ok: true; products: SharedCatalogProduct[] }
  | { ok: false };

type CartContextValue = {
  lines: CartLine[];
  /** Líneas crudas (slug/talla/cantidad/personalización), tal cual viven en
   * localStorage -- para que CarritoView pueda re-derivar líneas contra
   * datos recién llegados de refreshPrices() sin depender de que el estado
   * de React ya se haya re-renderizado (ver CarritoView.tsx). */
  storedLines: StoredLine[];
  count: number;
  subtotal: number;
  /** Envío gratis si el subtotal llega al mínimo; si no, el costo lo cierra el asesor por WhatsApp según la zona. */
  freeShipping: boolean;
  total: number;
  hydrated: boolean;
  /** true mientras falta resolver al menos un producto del carrito (ver CartLineStatus). */
  isResolving: boolean;
  /** true si el último intento de resolución agrupada falló por red/servidor. */
  resolveError: boolean;
  /** Reintenta resolver lo que falte (incluye productos marcados "unavailable"). */
  retryResolve: () => void;
  /** Vuelve a pedir precio/stock vigentes de TODO lo que hay en el carrito,
   * saltando la caché de CDN -- pensado para usarse antes de continuar a
   * WhatsApp. Todo o nada: si CUALQUIER lote falla devuelve { ok: false }
   * sin tocar lo ya resuelto/guardado; si todo sale bien devuelve también
   * los productos recién obtenidos para que quien llama (CarritoView) los
   * use directo, sin esperar a que el estado de React se re-renderice. */
  refreshPrices: () => Promise<RefreshResult>;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (
    product: SharedCatalogProduct,
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

type ResolveResponse = { products: SharedCatalogProduct[] };

async function fetchResolvedProducts(
  slugs: string[],
  opts?: { bypassCache?: boolean },
): Promise<SharedCatalogProduct[]> {
  const res = await fetch(buildCartItemsUrl(slugs, opts), {
    cache: opts?.bypassCache ? "no-store" : undefined,
  });
  if (!res.ok) throw new Error(`cart-items respondió ${res.status}`);
  const data = (await res.json()) as ResolveResponse;
  return data.products;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const { stored, pendingEffects } = state;
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const effectIdRef = useRef(0);

  // Caché interna de productos resueltos por slug: CartProvider ya no
  // recibe el catálogo completo (ver Fase 3B) -- esto reemplaza esa prop,
  // poblado por el fetch agrupado de abajo o directo al agregar desde una
  // ficha/QuickAdd (sin red, ver `add`).
  const [resolved, setResolved] = useState<Map<string, SharedCatalogProduct>>(
    () => new Map(),
  );
  // Slugs consultados al servidor que NO vinieron en la respuesta (ocultos,
  // eliminados o con el slug cambiado) -- se muestran como "ya no
  // disponible" en vez de desaparecer solos de stored/localStorage.
  const [unavailable, setUnavailable] = useState<Set<string>>(() => new Set());
  const [resolveError, setResolveError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  // Evita disparar dos fetches del mismo slug si dos renders consecutivos
  // todavía no vieron la respuesta del primero (p. ej. abrir/cerrar el
  // drawer rápido no cambia `stored`, pero por si acaso). Los slugs cuyo
  // ÚLTIMO intento falló se guardan en `failedSlugsRef` en vez de
  // reintentarse solos en bucle -- solo un reintento explícito (retryResolve)
  // o un cambio real del carrito los vuelve a pedir.
  const inFlightRef = useRef<Set<string>>(new Set());
  const failedSlugsRef = useRef<Set<string>>(new Set());
  // Guardas contra respuestas fuera de orden: cada intento de resolución
  // (automático o refreshPrices) se numera; si una respuesta más vieja
  // llega después de que una más nueva ya se aplicó PARA ESE MISMO SLUG,
  // se descarta en vez de pisar datos más recientes (ver sección 3 de la
  // verificación de la Fase 3B -- "una respuesta antigua no debe
  // sobrescribir información más reciente"). `add()` (que siembra datos ya
  // frescos en mano, sin red) también reclama la marca más reciente para
  // ese slug puntual para que ningún fetch en vuelo más viejo pueda
  // pisarla al resolver después.
  //
  // La marca es POR SLUG (Map<slug, seq>), no un único número global: un
  // intento más nuevo que resuelve un producto A no debe poder descartar
  // el resultado todavía válido de un intento más viejo que resolvía un
  // producto B completamente distinto -- eso sí pasaba con un solo
  // `appliedSeqRef` compartido (detectado en la verificación de cierre de
  // la Fase 3B): dos productos sin relación entre sí competían por la
  // misma marca global y el más viejo perdía aunque sus slugs nunca se
  // hubieran superpuesto con los del más nuevo.
  const attemptSeqRef = useRef(0);
  const appliedSeqBySlugRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    dispatch({ type: "hydrate", stored: readStorage() });
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

  // Efectos secundarios (toast, Meta Pixel) encolados por el reducer puro
  // (lib/cart-reducer.ts) -- nunca se disparan desde dentro de un updater
  // de estado, siempre acá, reaccionando al nuevo estado ya confirmado.
  // Importante bajo <StrictMode>/concurrencia: el reducer puede evaluarse
  // más de una vez por acción, pero este efecto solo corre (y solo una vez
  // por commit real) cuando `pendingEffects` efectivamente cambia.
  useEffect(() => {
    if (pendingEffects.length === 0) return;
    const ids: number[] = [];
    for (const effect of pendingEffects) {
      ids.push(effect.id);
      if (effect.kind === "add") {
        trackPixelEvent("AddToCart", {
          content_ids: [effect.product.id],
          content_name: effect.product.name,
          content_type: "product",
          value: effect.product.price * effect.qty,
          currency: "PYG",
        });
        if (effect.warning) toast.warning(effect.warning);
        if (effect.added) {
          toast("Añadido al carrito", {
            id: CART_TOAST_ID,
            description: `${effect.product.name} se agregó a tu carrito`,
            icon: cartToastIcon,
            duration: 3200,
            richColors: true,
            style: CART_TOAST_STYLE,
          });
        }
      } else if (effect.kind === "qty-warning") {
        toast.warning(effect.warning);
      } else if (effect.kind === "remove") {
        toast("Producto eliminado", {
          id: CART_TOAST_ID,
          description: effect.productName
            ? `${effect.productName} se quitó del carrito`
            : "Se quitó del carrito",
          icon: cartToastIcon,
          duration: 3200,
          richColors: true,
          style: CART_TOAST_STYLE,
        });
      }
    }
    dispatch({ type: "flushEffects", ids });
  }, [pendingEffects]);

  // Resolución agrupada de lo que falte: corre al restaurar el carrito
  // desde localStorage y cada vez que aparece un slug nuevo sin resolver.
  // Slugs ya en `resolved`/`unavailable` (o en vuelo, o cuyo último intento
  // falló) se filtran antes de pedir nada -- por eso cambiar cantidades o
  // abrir/cerrar el carrito no generan peticiones nuevas, y un carrito
  // vacío nunca llega a este `fetch` (neededSlugs queda en longitud 0). Se
  // parte en lotes de a lo sumo MAX_CART_RESOLVE_SLUGS (chunkSlugs) para
  // que un carrito con más productos distintos que el tope del endpoint
  // igual se resuelva entero, en vez de fallar con un solo 400.
  useEffect(() => {
    if (!hydrated) return;
    const neededSlugs = Array.from(new Set(stored.map((l) => l.slug))).filter(
      (slug) =>
        !resolved.has(slug) &&
        !unavailable.has(slug) &&
        !inFlightRef.current.has(slug) &&
        !failedSlugsRef.current.has(slug),
    );
    if (neededSlugs.length === 0) return;

    neededSlugs.forEach((s) => inFlightRef.current.add(s));
    const attemptSeq = ++attemptSeqRef.current;
    let cancelled = false;

    const chunks = chunkSlugs(neededSlugs);
    Promise.allSettled(chunks.map((chunk) => fetchResolvedProducts(chunk).then((products) => ({ chunk, products }))))
      .then((results) => {
        if (cancelled) return;

        const allProducts: SharedCatalogProduct[] = [];
        const okSlugs: string[] = [];
        let anyFailed = false;
        for (const r of results) {
          if (r.status === "fulfilled") {
            allProducts.push(...r.value.products);
            okSlugs.push(...r.value.chunk);
          } else {
            anyFailed = true;
          }
        }
        // Filtra por slug, no de golpe para todo el intento (ver
        // acceptFreshSlugs en lib/cart-resolve.ts): un fetch más nuevo que
        // ya haya reclamado alguno de estos slugs puntuales gana esos,
        // pero los demás slugs de este mismo resultado (sin relación con
        // ese otro intento) se aplican igual.
        const acceptedSlugs = acceptFreshSlugs(okSlugs, attemptSeq, appliedSeqBySlugRef.current);
        if (acceptedSlugs.length > 0) {
          const acceptedSet = new Set(acceptedSlugs);
          const acceptedProducts = allProducts.filter((p) => acceptedSet.has(p.slug));
          const foundSlugs = new Set(acceptedProducts.map((p) => p.slug));
          for (const s of acceptedSlugs) appliedSeqBySlugRef.current.set(s, attemptSeq);
          setResolved((prev) => {
            const next = new Map(prev);
            for (const p of acceptedProducts) next.set(p.slug, p);
            return next;
          });
          setUnavailable((prev) => {
            const next = new Set(prev);
            for (const s of acceptedSlugs) if (!foundSlugs.has(s)) next.add(s);
            return next;
          });
        }
        if (anyFailed) {
          // Promise.allSettled no liga el chunk original al resultado
          // rechazado -- se recupera por índice contra `chunks`.
          results.forEach((r, i) => {
            if (r.status === "rejected") chunks[i].forEach((s) => failedSlugsRef.current.add(s));
          });
        }
        setResolveError(anyFailed);
      })
      .finally(() => {
        neededSlugs.forEach((s) => inFlightRef.current.delete(s));
      });

    return () => {
      cancelled = true;
    };
  }, [stored, hydrated, resolved, unavailable, retryNonce]);

  const retryResolve = useCallback(() => {
    // Limpiar `unavailable` y `failedSlugsRef` le da a cada slug marcado
    // como no disponible/fallido otra oportunidad real de resolverse
    // (puede haber sido un error transitorio, o el producto volvió a estar
    // visible).
    setUnavailable(new Set());
    failedSlugsRef.current.clear();
    setResolveError(false);
    setRetryNonce((n) => n + 1);
  }, []);

  const refreshPrices = useCallback(async (): Promise<RefreshResult> => {
    const slugs = Array.from(new Set(stored.map((l) => l.slug)));
    if (slugs.length === 0) return { ok: true, products: [] };
    const attemptSeq = ++attemptSeqRef.current;
    try {
      // Todo o nada a propósito: esta es la verificación de vigencia previa
      // a WhatsApp (ver CarritoView.tsx), no la resolución progresiva de
      // fondo -- si un solo lote falla, no hay forma de garantizar que el
      // resto del carrito esté al día, así que se descarta el intento
      // entero en vez de confiar en una mezcla de datos frescos/viejos.
      const chunks = chunkSlugs(slugs);
      const productsPerChunk = await Promise.all(
        chunks.map((chunk) => fetchResolvedProducts(chunk, { bypassCache: true })),
      );
      const products = productsPerChunk.flat();

      // Igual que en la resolución de fondo: por slug, no de golpe -- el
      // valor que esta función DEVUELVE a quien la llama (CarritoView) ya
      // es siempre el dato recién pedido sin importar esto (ver `return`
      // más abajo); esto solo decide qué entra al estado de fondo
      // (resolved/unavailable) que usan el drawer y el resto de la UI.
      const acceptedSlugs = acceptFreshSlugs(slugs, attemptSeq, appliedSeqBySlugRef.current);
      if (acceptedSlugs.length > 0) {
        const acceptedSet = new Set(acceptedSlugs);
        const foundSlugs = new Set(products.map((p) => p.slug));
        for (const s of acceptedSlugs) appliedSeqBySlugRef.current.set(s, attemptSeq);
        setResolved((prev) => {
          const next = new Map(prev);
          for (const p of products) if (acceptedSet.has(p.slug)) next.set(p.slug, p);
          return next;
        });
        setUnavailable((prev) => {
          const next = new Set(prev);
          for (const s of acceptedSlugs) {
            if (foundSlugs.has(s)) next.delete(s);
            else next.add(s);
          }
          return next;
        });
        for (const s of acceptedSlugs) failedSlugsRef.current.delete(s);
      }
      return { ok: true, products };
    } catch {
      // Un error de red no debe tocar lo ya resuelto/guardado -- quien
      // llama (CarritoView, antes de continuar a WhatsApp) decide qué
      // hacer con { ok: false } (avisar y no continuar).
      return { ok: false };
    }
  }, [stored]);

  const add = useCallback(
    (
      product: SharedCatalogProduct,
      size: string,
      qty = 1,
      opts?: {
        silent?: boolean;
        note?: string | null;
        patches?: CartPatch[];
        addOnsPerUnit?: number;
      },
    ) => {
      const id = ++effectIdRef.current;
      dispatch({ type: "add", id, product, size, qty, opts });

      // Reutiliza los datos ya disponibles en la ficha/QuickAdd: ningún
      // fetch a /api/catalog/cart-items para un producto que el cliente ya
      // tiene completo enfrente. Este dato es, por definición, el más
      // fresco posible -- reclama la marca de "intento más reciente" para
      // ESE slug puntual para que una respuesta de red más vieja que siga
      // en vuelo para este mismo producto no lo pueda pisar al llegar
      // después (no afecta la marca de ningún otro slug).
      appliedSeqBySlugRef.current.set(product.slug, ++attemptSeqRef.current);
      setResolved((prev) => {
        if (prev.get(product.slug) === product) return prev;
        const next = new Map(prev);
        next.set(product.slug, product);
        return next;
      });
      setUnavailable((prev) => {
        if (!prev.has(product.slug)) return prev;
        const next = new Set(prev);
        next.delete(product.slug);
        return next;
      });
      failedSlugsRef.current.delete(product.slug);

      if (!opts?.silent) setIsOpen(true);
    },
    [],
  );

  const setQty = useCallback(
    (key: string, qty: number) => {
      const id = ++effectIdRef.current;
      dispatch({ type: "setQty", id, key, qty, resolved });
    },
    [resolved],
  );

  const remove = useCallback(
    (key: string) => {
      const id = ++effectIdRef.current;
      dispatch({ type: "remove", id, key, resolved });
    },
    [resolved],
  );

  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const lines = useMemo<CartLine[]>(
    () =>
      deriveCartLines(
        stored,
        (slug) => resolved.get(slug),
        (slug) => unavailable.has(slug),
      ),
    [stored, resolved, unavailable],
  );

  // El contador sale directo de `stored` (no de `lines`/productos resueltos)
  // para que se vea el número correcto desde el primer render hidratado,
  // sin esperar la resolución de red -- solo se descuentan los productos ya
  // confirmados como no disponibles, no los que todavía están "pending".
  const count = useMemo(
    () => stored.reduce((acc, l) => (unavailable.has(l.slug) ? acc : acc + l.qty), 0),
    [stored, unavailable],
  );
  const isResolving = useMemo(() => lines.some((l) => l.status === "pending"), [lines]);
  const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);
  const freeShipping = subtotal > 0 && subtotal >= FREE_SHIPPING_FROM;

  const value: CartContextValue = {
    lines,
    storedLines: stored,
    count,
    subtotal,
    freeShipping,
    // El costo de envío todavía no está automatizado: si no llega al
    // mínimo para envío gratis, el asesor lo cierra por WhatsApp según la
    // zona — no se suma ningún monto fijo al total.
    total: subtotal,
    hydrated,
    isResolving,
    resolveError,
    retryResolve,
    refreshPrices,
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
