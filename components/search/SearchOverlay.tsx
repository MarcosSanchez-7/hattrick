"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SharedCatalogProduct } from "@/lib/data";
import { buildSearchUrl, normalizeSearchQuery } from "@/lib/search-core";
import { formatPrice } from "@/lib/format";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconClose, IconSearch } from "@/components/ui/Icons";

const RECENT_SEARCHES_KEY = "hattrick.recentSearches.v1";
const MAX_RECENT_SEARCHES = 8;
const DEBOUNCE_MS = 300;

function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

function writeRecentSearches(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    // Modo privado / storage lleno — no es crítico, se ignora.
  }
}

// ── Caché de resultados + dedup de peticiones en vuelo ──────────────────
// A propósito a nivel de MÓDULO (no dentro del componente): SearchOverlay
// se desmonta por completo cada vez que se cierra el buscador (Navbar lo
// renderiza condicionalmente), así que un estado de React se perdería en
// cada cierre. Un Map a nivel de módulo sobrevive mientras dure la pestaña
// (misma sesión de SPA) -- abrir y cerrar el buscador seguido reusa lo ya
// pedido en vez de volver a golpear la red cada vez (ver sección 4 de la
// Fase 3C: "evitar consultas innecesarias al abrir y cerrar repetidamente
// el buscador").
type CacheEntry = { products: SharedCatalogProduct[]; expiresAt: number };

// Más que el s-maxage=30 del propio endpoint (ver route.ts) para que la
// caché del cliente no reviente justo antes que la del borde. OJO: esto
// significa que el desfase máximo real NO es 30s -- es la SUMA de ambas
// capas. Peor caso: el borde sirve una respuesta a los 29.9s (recién por
// vencer su propia ventana) y este cliente la guarda 60s más desde que la
// recibió -- hasta ~90s entre que se guarda un cambio administrativo
// (precio/stock/visibilidad/categoría/etiqueta) y que el último cliente
// con esa entrada en caché lo ve reflejado. Ningún caso de uso de la
// búsqueda (sugerir, no comprar) necesita algo más estricto que eso.
const CLIENT_CACHE_TTL_MS = 60_000;
const CLIENT_CACHE_MAX_ENTRIES = 20;

const resultsCache = new Map<string, CacheEntry>();
let suggestionsCache: CacheEntry | null = null;

// Cada entrada en vuelo lleva su PROPIO AbortController (no el signal de
// quien la pide) + un conteo de cuántos efectos siguen interesados en ella
// -- bug real encontrado en el cierre de la Fase 3C: cerrar el buscador
// mientras las sugerencias todavía viajaban abortaba la ÚNICA promesa
// compartida; si se reabría de inmediato, el nuevo efecto encontraba esa
// misma promesa en el mapa de deduplicación y quedaba esperando una
// petición que ya estaba condenada a rechazar (AbortError, silenciado por
// el catch), trabado en "loading" para siempre sin ningún reintento
// automático. Con refCount, abortar solo pasa cuando el ÚLTIMO interesado
// se va; con el chequeo de `signal.aborted` al reusar, un interesado nuevo
// nunca hereda una entrada que ya esté condenada a rechazar, aunque llegue
// en el mismo instante en que la anterior se abortó.
type InFlightEntry = {
  promise: Promise<SharedCatalogProduct[]>;
  controller: AbortController;
  refCount: number;
};
const inFlightRequests = new Map<string, InFlightEntry>();

function getCachedResults(key: string): SharedCatalogProduct[] | null {
  const hit = resultsCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    resultsCache.delete(key);
    return null;
  }
  // Reinsertar mueve la entrada al final (orden de inserción de Map) --
  // LRU simple para decidir qué tirar primero al pasarse del tope.
  resultsCache.delete(key);
  resultsCache.set(key, hit);
  return hit.products;
}

function setCachedResults(key: string, products: SharedCatalogProduct[]) {
  resultsCache.set(key, { products, expiresAt: Date.now() + CLIENT_CACHE_TTL_MS });
  if (resultsCache.size > CLIENT_CACHE_MAX_ENTRIES) {
    const oldestKey = resultsCache.keys().next().value;
    if (oldestKey !== undefined) resultsCache.delete(oldestKey);
  }
}

function getCachedSuggestions(): SharedCatalogProduct[] | null {
  if (!suggestionsCache) return null;
  if (Date.now() > suggestionsCache.expiresAt) {
    suggestionsCache = null;
    return null;
  }
  return suggestionsCache.products;
}

type SearchSubscription = {
  promise: Promise<SharedCatalogProduct[]>;
  /** Avisa que este efecto ya no necesita la respuesta -- si era el último
   * interesado, recién ahí se aborta la petición real. */
  release: () => void;
};

/**
 * Pide (o reusa) los resultados para `query` -- key vacía = sugerencias
 * (novedades). Dos llamadas concurrentes por el mismo término comparten UNA
 * sola petición en vuelo en vez de duplicarla (ver sección 4: "deduplicar
 * peticiones concurrentes"), pero cada suscripción se libera por separado
 * (`release`) en vez de que cualquier efecto pueda cancelarla por todos.
 */
function fetchSearch(query: string): SearchSubscription {
  const key = normalizeSearchQuery(query);
  const cached = key ? getCachedResults(key) : getCachedSuggestions();
  if (cached) return { promise: Promise.resolve(cached), release: () => {} };

  const existing = inFlightRequests.get(key);
  // No reusar una entrada cuyo controller YA fue abortado por el último
  // interesado anterior -- esa promesa está condenada a rechazar aunque
  // todavía no haya llegado a borrarse del mapa (la limpieza del
  // .finally() es asíncrona). Un interesado nuevo necesita una petición
  // propia, no heredar el rechazo de alguien que ya se fue.
  if (existing && !existing.controller.signal.aborted) {
    existing.refCount++;
    return { promise: existing.promise, release: () => release(existing) };
  }

  const controller = new AbortController();
  const entry: InFlightEntry = {
    controller,
    refCount: 1,
    promise: (async () => {
      const res = await fetch(buildSearchUrl(query), { signal: controller.signal });
      if (!res.ok) throw new Error(`search respondió ${res.status}`);
      const data = (await res.json()) as { products: SharedCatalogProduct[] };
      if (key) setCachedResults(key, data.products);
      else suggestionsCache = { products: data.products, expiresAt: Date.now() + CLIENT_CACHE_TTL_MS };
      return data.products;
    })().finally(() => {
      // Solo se borra a sí misma -- si para cuando esto corre ya hay una
      // entrada MÁS NUEVA en el mapa (otro ciclo, mismo key), no la toca.
      if (inFlightRequests.get(key) === entry) inFlightRequests.delete(key);
    }),
  };
  inFlightRequests.set(key, entry);
  return { promise: entry.promise, release: () => release(entry) };
}

function release(entry: InFlightEntry) {
  entry.refCount--;
  if (entry.refCount <= 0) entry.controller.abort();
}

type Status = "loading" | "ready" | "error";

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<SharedCatalogProduct[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [retryNonce, setRetryNonce] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  // Debounce ~300ms: la query recién "cuenta" para pedir resultados cuando
  // el usuario deja de escribir un rato -- sin esto, cada tecla dispararía
  // su propia petición.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Única fuente de peticiones de búsqueda: corre al abrir (debouncedQuery
  // arranca en "", pide sugerencias de inmediato, sin esperar el debounce)
  // y cada vez que el término ya "asentado" cambia. AbortController cancela
  // la petición obsoleta si el usuario sigue escribiendo antes de que
  // responda; `cancelled` evita aplicar una respuesta que ya no corresponde
  // a la query actual aunque el fetch no llegue a cancelarse a tiempo (ver
  // sección 4: "cancelar peticiones obsoletas" + "impedir que respuestas
  // antiguas sobrescriban resultados recientes").
  useEffect(() => {
    let cancelled = false;
    const key = normalizeSearchQuery(debouncedQuery);
    const cached = key ? getCachedResults(key) : getCachedSuggestions();

    if (cached) {
      setItems(cached);
      setStatus("ready");
      return;
    }

    setStatus("loading");

    const { promise, release } = fetchSearch(debouncedQuery);
    promise
      .then((products) => {
        if (cancelled) return;
        setItems(products);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
      release();
    };
  }, [debouncedQuery, retryNonce]);

  const recordSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const deduped = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...deduped].slice(0, MAX_RECENT_SEARCHES);
      writeRecentSearches(next);
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    writeRecentSearches([]);
  };

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.dataset.scrollLocked = "true";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.dataset.scrollLocked = "false";
    };
  }, [onClose]);

  const renderProductRow = (p: SharedCatalogProduct, onClick: () => void) => (
    <Link key={p.id} href={`/producto/${p.slug}`} className="search__row" onClick={onClick}>
      <div className="search__row-art">
        <ProductVisual
          images={p.images}
          colors={p.colors}
          pattern={p.pattern}
          uid={`s-${p.id}`}
          alt={p.name}
          size="thumb"
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{p.name}</div>
      </div>
      <div className="price">{formatPrice(p.price)}</div>
    </Link>
  );

  const renderSkeletonRow = (key: number) => (
    <div className="search__row" key={`skeleton-${key}`} aria-hidden="true">
      <div className="search__row-art">
        <div className="skeleton" style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="skeleton" style={{ width: "70%", height: "1em" }} />
      </div>
      <div className="skeleton" style={{ width: 64, height: "1em" }} />
    </div>
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    recordSearch(query);
    router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
    onClose();
  };

  const trimmed = query.trim();
  const isSuggestionsView = trimmed === "";

  return (
    <div className="search" role="dialog" aria-modal="true" aria-label="Buscar">
      <div className="search__panel">
        <div className="container">
          <form className="search__field" onSubmit={submit}>
            <IconSearch />
            <input
              ref={inputRef}
              className="search__input"
              placeholder="Busca por equipo, liga, temporada o color…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Término de búsqueda"
            />
            <button
              type="button"
              onClick={onClose}
              className="nav__icon-btn"
              aria-label="Cerrar buscador"
            >
              <IconClose />
            </button>
          </form>

          <div className="search__body">
            {isSuggestionsView ? (
              <>
                {recentSearches.length > 0 ? (
                  <div style={{ marginBottom: 28 }}>
                    <div
                      className="row"
                      style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}
                    >
                      <p className="label" style={{ color: "var(--ink-muted)", margin: 0 }}>
                        Búsquedas recientes
                      </p>
                      <button
                        type="button"
                        className="link-underline meta"
                        onClick={clearRecentSearches}
                      >
                        Borrar
                      </button>
                    </div>
                    <div className="search__suggests">
                      {recentSearches.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="chip"
                          onClick={() => setQuery(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {status === "error" ? (
                  <div className="row gap-3">
                    <span className="meta">No se pudieron cargar las novedades.</span>
                    <button
                      type="button"
                      className="link-underline meta"
                      onClick={() => setRetryNonce((n) => n + 1)}
                    >
                      Reintentar
                    </button>
                  </div>
                ) : status === "loading" ? (
                  <div>
                    <p className="label" style={{ color: "var(--ink-muted)", marginBottom: 12 }}>
                      Novedades
                    </p>
                    <div>{[0, 1, 2].map(renderSkeletonRow)}</div>
                  </div>
                ) : items.length > 0 ? (
                  <div>
                    <p className="label" style={{ color: "var(--ink-muted)", marginBottom: 12 }}>
                      Novedades
                    </p>
                    <div>{items.map((p) => renderProductRow(p, onClose))}</div>
                    <Link
                      href="/novedades"
                      className="btn btn--ghost btn--sm"
                      style={{ marginTop: 24, display: "inline-flex" }}
                      onClick={onClose}
                    >
                      Ver todas las novedades
                    </Link>
                  </div>
                ) : null}
              </>
            ) : status === "error" ? (
              <div className="row gap-3">
                <span className="meta">No se pudo completar la búsqueda. Revisá tu conexión.</span>
                <button
                  type="button"
                  className="link-underline meta"
                  onClick={() => setRetryNonce((n) => n + 1)}
                >
                  Reintentar
                </button>
              </div>
            ) : status === "loading" ? (
              <div>{[0, 1, 2].map(renderSkeletonRow)}</div>
            ) : items.length === 0 ? (
              <p className="lead">
                No hay resultados para <strong>«{query}»</strong>. Prueba con el
                nombre del club, la liga o el año.
              </p>
            ) : (
              <>
                <p className="label" style={{ color: "var(--ink-muted)", marginBottom: 12 }}>
                  {items.length} resultado{items.length > 1 ? "s" : ""}
                </p>
                <div>
                  {items.map((p) =>
                    renderProductRow(p, () => {
                      recordSearch(query);
                      onClose();
                    }),
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  style={{ marginTop: 24 }}
                  onClick={submit}
                >
                  Ver todos los resultados
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <button
        className="search__scrim"
        onClick={onClose}
        aria-label="Cerrar buscador"
        tabIndex={-1}
      />
    </div>
  );
}
