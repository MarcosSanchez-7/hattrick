"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchProducts, type Product, type Tag } from "@/lib/catalog";
import { ProductBrowser } from "@/components/product/ProductBrowser";
import { IconSearch } from "@/components/ui/Icons";

const POPULARES = ["Retro", "Real Madrid", "Selecciones", "Niños", "Amarillo"];
const URL_SYNC_DELAY_MS = 400;

/**
 * Búsqueda en vivo: los resultados (ya clicables) se actualizan en cada
 * pulsación, sin esperar a enviar el formulario. La URL se sincroniza con
 * un pequeño debounce solo para que el enlace siga siendo compartible y
 * funcione el botón "atrás", sin disparar una recarga de página.
 */
export function SearchPageClient({
  products,
  tags = [],
  initialQuery,
}: {
  products: Product[];
  tags?: Tag[];
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(
    () => (query.trim() ? searchProducts(products, query) : []),
    [products, query],
  );

  useEffect(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const trimmed = query.trim();
      const url = trimmed ? `/buscar?q=${encodeURIComponent(trimmed)}` : "/buscar";
      router.replace(url, { scroll: false });
    }, URL_SYNC_DELAY_MS);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const trimmed = query.trim();

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Buscar</span>
          </nav>
          <h1 className="h1">
            {trimmed ? <>Resultados para «{trimmed}»</> : "Buscar en el catálogo"}
          </h1>

          <form
            className="field-inline"
            style={{ marginTop: 24, maxWidth: 560 }}
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Equipo, liga, temporada o color…"
              aria-label="Buscar productos"
              autoFocus
            />
            <button type="submit" className="btn">
              <IconSearch className="icon--sm" />
              Buscar
            </button>
          </form>

          <div className="search__suggests" style={{ marginTop: 16 }}>
            {POPULARES.map((s) => (
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
      </header>

      <section className="section section--tight">
        <div className="container">
          {!trimmed ? (
            <div className="empty-state">
              <h3 className="h2">Escribe qué camiseta buscas</h3>
              <p className="meta">
                Puedes buscar por club, selección, liga, año o color. Los
                resultados aparecen mientras escribes.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <h3 className="h2">Sin resultados para «{trimmed}»</h3>
              <p className="meta" style={{ maxWidth: "44ch" }}>
                Revisa la ortografía o prueba con un término más general, como
                el nombre de la liga.
              </p>
              <Link href="/novedades" className="btn btn--ghost btn--sm">
                Ver nuevos ingresos
              </Link>
            </div>
          ) : (
            <ProductBrowser products={results} tags={tags} />
          )}
        </div>
      </section>
    </>
  );
}
