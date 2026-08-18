"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchProducts, type Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconClose, IconSearch } from "@/components/ui/Icons";

/** Solo se muestran si el cliente todavía no tiene búsquedas propias guardadas. */
const FALLBACK_SUGGESTIONS = [
  "Real Madrid",
  "Retro",
  "Selecciones",
  "Barcelona",
  "Mundial 2026",
  "Niños",
  "Premier League",
  "Amarillo",
];

const RECENT_SEARCHES_KEY = "hattrick.recentSearches.v1";
const MAX_RECENT_SEARCHES = 8;

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

export function SearchOverlay({
  products,
  onClose,
}: {
  products: Product[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

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

  const results = useMemo(
    () => searchProducts(products, query).slice(0, 6),
    [products, query],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    recordSearch(query);
    router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
    onClose();
  };

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
            {query.trim() === "" ? (
              <>
                <div
                  className="row"
                  style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}
                >
                  <p className="label" style={{ color: "var(--ink-muted)", margin: 0 }}>
                    {recentSearches.length > 0 ? "Búsquedas recientes" : "Búsquedas frecuentes"}
                  </p>
                  {recentSearches.length > 0 ? (
                    <button
                      type="button"
                      className="link-underline meta"
                      onClick={clearRecentSearches}
                    >
                      Borrar
                    </button>
                  ) : null}
                </div>
                <div className="search__suggests">
                  {(recentSearches.length > 0 ? recentSearches : FALLBACK_SUGGESTIONS).map((s) => (
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
              </>
            ) : results.length === 0 ? (
              <p className="lead">
                No hay resultados para <strong>«{query}»</strong>. Prueba con el
                nombre del club, la liga o el año.
              </p>
            ) : (
              <>
                <p className="label" style={{ color: "var(--ink-muted)", marginBottom: 12 }}>
                  {results.length} resultado{results.length > 1 ? "s" : ""}
                </p>
                <div>
                  {results.map((p) => (
                    <Link
                      key={p.id}
                      href={`/producto/${p.slug}`}
                      className="search__row"
                      onClick={() => {
                        recordSearch(query);
                        onClose();
                      }}
                    >
                      <div className="search__row-art">
                        <ProductVisual
                          images={p.images}
                          colors={p.colors}
                          pattern={p.pattern}
                          uid={`s-${p.id}`}
                          alt={p.name}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                      </div>
                      <div className="price">{formatPrice(p.price)}</div>
                    </Link>
                  ))}
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
