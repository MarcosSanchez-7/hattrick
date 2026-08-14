import type { Metadata } from "next";
import Link from "next/link";
import { discountPercent, onSaleProducts } from "@/lib/catalog";
import { getAllProducts, getAllTags } from "@/lib/data";
import { ProductBrowser } from "@/components/product/ProductBrowser";
import { Countdown } from "@/components/home/Countdown";

export const metadata: Metadata = {
  title: "Ofertas",
  description:
    "Camisetas de fútbol rebajadas hasta un 25 %. Stock limitado y envío gratis desde Gs. 650.000.",
  alternates: { canonical: "/ofertas" },
};

export const dynamic = "force-dynamic";

export default async function OfertasPage() {
  const [allProducts, tags] = await Promise.all([getAllProducts(), getAllTags()]);
  const products = onSaleProducts(allProducts);
  const max = products.length
    ? Math.max(...products.map(discountPercent))
    : 0;

  return (
    <>
      <header className="page-head page-head--dark">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Ofertas</span>
          </nav>
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div>
              <span className="label" style={{ color: "#ff6b6b" }}>
                {products.length > 0
                  ? `Hasta −${max} % · Termina el domingo`
                  : "Vuelve pronto"}
              </span>
              <h1 className="h1" style={{ marginTop: 8 }}>
                Ofertas
              </h1>
              <p className="lead" style={{ marginTop: 12 }}>
                {products.length > 0
                  ? `Precios rebajados en ${products.length} referencias mientras dure el stock. Las tallas más habituales vuelan.`
                  : "Ahora mismo no hay artículos en oferta. Échale un vistazo a los nuevos ingresos."}
              </p>
            </div>
            {products.length > 0 ? (
              <div className="offers">
                <Countdown />
              </div>
            ) : null}
          </div>
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
