"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchProducts, type Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconClose, IconSearch } from "@/components/ui/Icons";

const SUGGESTIONS = [
  "Real Madrid",
  "Retro",
  "Selecciones",
  "Barcelona",
  "Mundial 2026",
  "Niños",
  "Premier League",
  "Amarillo",
];

export function SearchOverlay({
  products,
  onClose,
}: {
  products: Product[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
                <p className="label" style={{ color: "var(--ink-muted)", marginBottom: 12 }}>
                  Búsquedas frecuentes
                </p>
                <div className="search__suggests">
                  {SUGGESTIONS.map((s) => (
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
                      onClick={onClose}
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
