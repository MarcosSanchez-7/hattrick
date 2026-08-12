import type { Metadata } from "next";
import Link from "next/link";
import { newArrivals } from "@/lib/catalog";
import { getAllProducts, getAllTags } from "@/lib/data";
import { ProductBrowser } from "@/components/product/ProductBrowser";

export const metadata: Metadata = {
  title: "Nuevos ingresos",
  description:
    "Las últimas equipaciones que han entrado en el almacén: temporada 25/26 y Mundial 2026.",
  alternates: { canonical: "/novedades" },
};

export const dynamic = "force-dynamic";

export default async function NovedadesPage() {
  const [allProducts, tags] = await Promise.all([getAllProducts(), getAllTags()]);
  const products = newArrivals(allProducts);

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Nuevos ingresos</span>
          </nav>
          <span className="label" style={{ color: "var(--ink-muted)" }}>
            Actualizado esta semana
          </span>
          <h1 className="h1" style={{ marginTop: 8 }}>
            Nuevos ingresos
          </h1>
          <p className="lead" style={{ marginTop: 12 }}>
            Primeras equipaciones 25/26 y camisetas de selección para el Mundial
            2026. Unidades limitadas por talla en los lanzamientos.
          </p>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container">
          <ProductBrowser products={products} tags={tags} />
        </div>
      </section>
    </>
  );
}
