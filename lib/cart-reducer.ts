// Máquina de estados pura del carrito -- sin React, sin "use client", sin
// efectos secundarios (nada de toast()/trackPixelEvent() acá). CartProvider.tsx
// la conecta vía useReducer y dispara los efectos secundarios desde un
// useEffect que observa `pendingEffects`, nunca desde dentro del reducer.
//
// Por qué: un updater function de setState (o un reducer de useReducer)
// puede ejecutarse más de una vez por la misma acción (p. ej. en desarrollo,
// bajo <StrictMode>, React llama al reducer dos veces a propósito para
// detectar funciones impuras) y no está garantizado que corra de forma
// síncrona respecto al resto del código del event handler que lo llamó. La
// versión anterior de add() mutaba una variable externa (`let added = false`)
// dentro del updater y la leía justo después, apoyándose en una optimización
// interna de React ("eager state": solo se computa sincrónicamente si es el
// primer setState sin trabajo pendiente en ese fiber) -- al agregar más
// setState antes en la misma función esa lectura dejó de funcionar (el toast
// de "Añadido al carrito" dejaba de dispararse). Acá el reducer es 100% puro
// (misma acción + mismo estado = mismo resultado, sin leer nada por fuera) y
// el resultado de cada acción (qué pasó, qué toast corresponde) viaja DENTRO
// del nuevo estado (`pendingEffects`), no por un efecto colateral paralelo.
import type { SharedCatalogProduct } from "./shared-catalog-product.ts";

export type CartPatch = { name: string; price: number };

export type StoredLine = {
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

/** Tope de unidades por talla cuando no se expone el stock real (ver
 * SharedCatalogProduct/PublicProduct.variants en lib/data.ts): no es un
 * límite de inventario real, es solo una ayuda de UX para que el cliente
 * no pida una cantidad absurda por WhatsApp -- la venta real se valida a
 * mano con el stock exacto en el panel (SaleForm), este número nunca fue
 * una barrera de integridad de datos. */
export const MAX_CART_QTY = 10;

/** Dos líneas del mismo producto/talla pero con personalización o parches
 * distintos no deben mezclarse — se incluyen en la key para diferenciarlas. */
export function lineKey(
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

/** Tope de unidades para esa talla: 0 si está agotada, MAX_CART_QTY si hay
 * disponibilidad (sin revelar cuánto queda realmente), o null si el
 * producto no lleva stock propio (ajeno/importado, "Consultar talle"). */
export function availableStock(product: SharedCatalogProduct, size: string): number | null {
  const variant = product.variants?.find((v) => v.size === size);
  if (!variant) return null;
  return variant.inStock ? MAX_CART_QTY : 0;
}

/** Aviso cuando se pide más que el tope por talla. Sin revelar el stock
 * real: si la talla sigue disponible, un aviso de urgencia genérico; si
 * está agotada (max === 0), no hace falta aviso aparte -- sizes/soldOut ya
 * la muestra como "Agotado" en la ficha/tarjeta. */
export function stockWarningFor(size: string, max: number): string | null {
  if (max <= 0) return null;
  return `¡Últimas unidades disponibles de la talla ${size}!`;
}

export type AddOpts = {
  silent?: boolean;
  note?: string | null;
  patches?: CartPatch[];
  addOnsPerUnit?: number;
};

/** Resultado de una acción que el componente debe convertir en un efecto
 * secundario real (toast, Meta Pixel) -- generado por el reducer, consumido
 * por un useEffect en CartProvider.tsx. `id` es único por acción despachada
 * (ver effectIdRef en CartProvider.tsx) para poder "marcar como atendido"
 * sin perder ni repetir efectos aunque varias acciones se despachen en el
 * mismo tick (batching). */
export type PendingEffect =
  | {
      id: number;
      kind: "add";
      product: SharedCatalogProduct;
      qty: number;
      added: boolean;
      warning: string | null;
    }
  | { id: number; kind: "qty-warning"; warning: string }
  | { id: number; kind: "remove"; productName: string | null };

export type CartState = {
  stored: StoredLine[];
  pendingEffects: PendingEffect[];
};

export const initialCartState: CartState = { stored: [], pendingEffects: [] };

export type CartAction =
  | { type: "hydrate"; stored: StoredLine[] }
  | { type: "add"; id: number; product: SharedCatalogProduct; size: string; qty: number; opts?: AddOpts }
  | {
      type: "setQty";
      id: number;
      key: string;
      qty: number;
      resolved: ReadonlyMap<string, SharedCatalogProduct>;
    }
  | {
      type: "remove";
      id: number;
      key: string;
      resolved: ReadonlyMap<string, SharedCatalogProduct>;
    }
  | { type: "clear" }
  | { type: "flushEffects"; ids: number[] };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { stored: action.stored, pendingEffects: [] };

    case "clear":
      return { ...state, stored: [] };

    case "flushEffects": {
      if (action.ids.length === 0) return state;
      const ids = new Set(action.ids);
      return { ...state, pendingEffects: state.pendingEffects.filter((e) => !ids.has(e.id)) };
    }

    case "add": {
      const { product, size, qty, opts, id } = action;
      const max = availableStock(product, size);
      const note = opts?.note ?? null;
      const patches = opts?.patches ?? null;
      const key = lineKey(product.slug, size, note, patches);
      const idx = state.stored.findIndex(
        (l) => lineKey(l.slug, l.size, l.note, l.patches) === key,
      );
      const currentQty = idx === -1 ? 0 : state.stored[idx].qty;
      const requested = currentQty + qty;
      const capped = max != null ? Math.min(requested, max) : Math.min(requested, MAX_CART_QTY);
      const added = capped > currentQty;
      const warning = max != null && requested > max ? stockWarningFor(size, max) : null;

      let nextStored: StoredLine[];
      if (idx === -1) {
        nextStored =
          capped <= 0
            ? state.stored
            : [
                ...state.stored,
                {
                  slug: product.slug,
                  size,
                  qty: capped,
                  note,
                  patches,
                  addOnsPerUnit: opts?.addOnsPerUnit ?? 0,
                },
              ];
      } else {
        nextStored = [...state.stored];
        nextStored[idx] = { ...nextStored[idx], qty: capped };
      }

      return {
        stored: nextStored,
        pendingEffects: [...state.pendingEffects, { id, kind: "add", product, qty, added, warning }],
      };
    }

    case "setQty": {
      const { key, qty, resolved, id } = action;
      let warning: string | null = null;
      const nextStored = state.stored.flatMap((l) => {
        if (lineKey(l.slug, l.size, l.note, l.patches) !== key) return [l];
        if (qty <= 0) return [];
        const product = resolved.get(l.slug);
        const max = product ? availableStock(product, l.size) : null;
        const capped = max != null ? Math.min(qty, max) : Math.min(qty, MAX_CART_QTY);
        if (max != null && qty > max) warning = stockWarningFor(l.size, max);
        return [{ ...l, qty: capped }];
      });
      const pendingEffects = warning
        ? [...state.pendingEffects, { id, kind: "qty-warning" as const, warning }]
        : state.pendingEffects;
      return { stored: nextStored, pendingEffects };
    }

    case "remove": {
      const { key, resolved, id } = action;
      const line = state.stored.find(
        (l) => lineKey(l.slug, l.size, l.note, l.patches) === key,
      );
      const productName = line ? (resolved.get(line.slug)?.name ?? null) : null;
      const nextStored = state.stored.filter(
        (l) => lineKey(l.slug, l.size, l.note, l.patches) !== key,
      );
      return {
        stored: nextStored,
        pendingEffects: [...state.pendingEffects, { id, kind: "remove", productName }],
      };
    }
  }
}

/**
 * "pending": todavía no llegó la resolución del producto (recién
 * restaurado de localStorage, esperando el fetch agrupado) — el consumidor
 * debe mostrar un skeleton, no asumir product !== null.
 * "unavailable": se consultó al servidor y el producto no vino en la
 * respuesta (oculto/eliminado/slug cambiado) — line.product queda null a
 * propósito; la línea NO se borra de stored/localStorage sola, el cliente
 * decide si la quita con remove().
 * "resolved": product listo para mostrar precio/stock/imagen reales.
 */
export type CartLineStatus = "pending" | "unavailable" | "resolved";

export type CartLine = StoredLine & {
  key: string;
  status: CartLineStatus;
  product: SharedCatalogProduct | null;
  lineTotal: number;
};

/**
 * Deriva las líneas "de presentación" (con producto/estado/subtotal) a
 * partir de `stored` -- función pura para que tanto CartProvider.tsx (con
 * el estado React en vivo) como CarritoView.tsx (con un mapa de productos
 * recién llegado de refreshPrices(), ANTES de que el estado de React se
 * re-renderice) puedan calcular exactamente lo mismo sin depender de
 * timing. `resolveProduct`/`isUnavailable` son funciones en vez de
 * Map/Set directamente para que cualquiera de las dos fuentes (estado
 * reactivo o datos recién fetcheados) sirva igual.
 */
export function deriveCartLines(
  stored: StoredLine[],
  resolveProduct: (slug: string) => SharedCatalogProduct | null | undefined,
  isUnavailable: (slug: string) => boolean,
): CartLine[] {
  return stored.map((l) => {
    const key = lineKey(l.slug, l.size, l.note, l.patches);
    const product = resolveProduct(l.slug) ?? null;
    const status: CartLineStatus = product
      ? "resolved"
      : isUnavailable(l.slug)
        ? "unavailable"
        : "pending";
    const lineTotal = product ? (product.price + (l.addOnsPerUnit ?? 0)) * l.qty : 0;
    return { ...l, key, status, product, lineTotal };
  });
}
