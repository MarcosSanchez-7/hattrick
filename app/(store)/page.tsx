import Link from "next/link";
import { bestSellers, newArrivals } from "@/lib/catalog";
import { getAllCategories, getAllProducts, getSetting } from "@/lib/data";
import { DEFAULT_CUSTOM_BANNER, DEFAULT_HERO } from "@/lib/settings";
import { Hero } from "@/components/home/Hero";
import { ValueProps } from "@/components/home/ValueProps";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { OffersSection } from "@/components/home/OffersSection";
import { CustomBanner } from "@/components/home/CustomBanner";
import { Newsletter } from "@/components/home/Newsletter";
import { ProductGrid } from "@/components/product/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, categories, heroSettings, customBannerSettings] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
    getSetting("hero", DEFAULT_HERO),
    getSetting("customBanner", DEFAULT_CUSTOM_BANNER),
  ]);
  const nuevos = newArrivals(products).slice(0, 8);
  const populares = bestSellers(products).slice(0, 4);

  return (
    <>
      <Hero settings={heroSettings} />
      <ValueProps />

      {/* Nuevos ingresos */}
      {nuevos.length > 0 ? (
        <section className="section" id="novedades">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="label section-head__eyebrow">
                  Recién llegado al almacén
                </span>
                <h2 className="h1">Nuevos ingresos</h2>
              </div>
              <Link href="/novedades" className="section-head__link">
                Ver los {newArrivals(products).length} artículos nuevos
              </Link>
            </div>
            <ProductGrid products={nuevos} />
          </div>
        </section>
      ) : null}

      <CategoryGrid categories={categories} products={products} />
      <OffersSection products={products} />

      {/* Más vendidos */}
      {populares.length > 0 ? (
        <section className="section section--soft">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="label section-head__eyebrow">
                  Lo que más se lleva
                </span>
                <h2 className="h1">Más vendidos</h2>
              </div>
              <Link href="/buscar" className="section-head__link">
                Ver todo el catálogo
              </Link>
            </div>
            <ProductGrid products={populares} />
          </div>
        </section>
      ) : null}

      <CustomBanner settings={customBannerSettings} />
      <Newsletter />
    </>
  );
}
