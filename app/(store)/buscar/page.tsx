import type { Metadata } from "next";
import Link from "next/link";
import { searchProducts } from "@/lib/catalog";
import { getAllProducts } from "@/lib/data";
import { ProductBrowser } from "@/components/product/ProductBrowser";
import { IconSearch } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Busca camisetas por equipo, liga, temporada o color.",
};

export const dynamic = "force-dynamic";

const POPULARES = ["Retro", "Real Madrid", "Selecciones", "Niños", "Amarillo"];

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? searchProducts(await getAllProducts(), query) : [];

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
            {query ? <>Resultados para «{query}»</> : "Buscar en el catálogo"}
          </h1>

          <form
            action="/buscar"
            method="get"
            className="field-inline"
            style={{ marginTop: 24, maxWidth: 560 }}
          >
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Equipo, liga, temporada o color…"
              aria-label="Buscar productos"
            />
            <button type="submit" className="btn">
              <IconSearch className="icon--sm" />
              Buscar
            </button>
          </form>

          <div className="search__suggests" style={{ marginTop: 16 }}>
            {POPULARES.map((s) => (
              <Link key={s} href={`/buscar?q=${encodeURIComponent(s)}`} className="chip">
                {s}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container">
          {!query ? (
            <div className="empty-state">
              <h3 className="h2">Escribe qué camiseta buscas</h3>
              <p className="meta">
                Puedes buscar por club, selección, liga, año o color.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <h3 className="h2">Sin resultados para «{query}»</h3>
              <p className="meta" style={{ maxWidth: "44ch" }}>
                Revisa la ortografía o prueba con un término más general, como
                el nombre de la liga.
              </p>
              <Link href="/novedades" className="btn btn--ghost btn--sm">
                Ver nuevos ingresos
              </Link>
            </div>
          ) : (
            <ProductBrowser products={results} />
          )}
        </div>
      </section>
    </>
  );
}
