import type { Metadata } from "next";
import Link from "next/link";
import { bestSellers, byCategoryTree, categorySlugPath, getCategory, newArrivals } from "@/lib/catalog";
import { getAllCategories, getAllProducts, getAllTags, getSetting } from "@/lib/data";
import {
  DEFAULT_CUSTOM_BANNER,
  DEFAULT_DTF,
  DEFAULT_HERO,
  DEFAULT_HOME,
  DEFAULT_REVIEWS,
  DEFAULT_VALUE_PROPS,
  DEFAULT_WHOLESALE,
} from "@/lib/settings";
import { Hero } from "@/components/home/Hero";
import { QuickCategories } from "@/components/home/QuickCategories";
import { ValueProps } from "@/components/home/ValueProps";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { OffersSection } from "@/components/home/OffersSection";
import { DtfSection } from "@/components/home/DtfSection";
import { CustomBanner } from "@/components/home/CustomBanner";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { ProductGrid } from "@/components/product/ProductCard";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [
    products,
    categories,
    tags,
    heroSettings,
    customBannerSettings,
    homeSettings,
    valuePropsSettings,
    reviewsSettings,
    dtfSettings,
    wholesaleSettings,
  ] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
    getAllTags(),
    getSetting("hero", DEFAULT_HERO),
    getSetting("customBanner", DEFAULT_CUSTOM_BANNER),
    getSetting("home", DEFAULT_HOME),
    getSetting("valueProps", DEFAULT_VALUE_PROPS),
    getSetting("reviews", DEFAULT_REVIEWS),
    getSetting("dtf", DEFAULT_DTF),
    getSetting("wholesale", DEFAULT_WHOLESALE),
  ]);
  const nuevos = newArrivals(products).slice(0, 8);
  const populares = bestSellers(products).slice(0, 4);
  const firstSlideImage = heroSettings.slides[0]?.image;
  const firstSlideMobileImage = heroSettings.slides[0]?.mobileImage;

  const combosCategory = homeSettings.combos.categorySlug
    ? getCategory(categories, homeSettings.combos.categorySlug)
    : undefined;
  const combos = combosCategory
    ? byCategoryTree(products, categories, combosCategory.slug).slice(0, 4)
    : [];

  const dtfCategory = dtfSettings.categorySlug
    ? getCategory(categories, dtfSettings.categorySlug)
    : undefined;
  const dtfProducts = dtfCategory
    ? byCategoryTree(products, categories, dtfCategory.slug).slice(0, 12)
    : [];

  return (
    <>
      {/* El Hero pinta la primera imagen como background-image en CSS (no
          <img>), así que no hay atributo loading/fetchPriority que setear
          ahí — este preload es la forma de darle prioridad de carga al
          candidato más probable a LCP del home. Dos <link> con `media` en
          vez de uno: el navegador descarga solo la que de verdad va a usar
          según el viewport (mismo breakpoint que .hero__slide en
          globals.css), no ambas. */}
      {firstSlideImage ? (
        <link
          rel="preload"
          as="image"
          href={firstSlideImage}
          fetchPriority="high"
          media={firstSlideMobileImage ? "(min-width: 641px)" : undefined}
        />
      ) : null}
      {firstSlideMobileImage ? (
        <link
          rel="preload"
          as="image"
          href={firstSlideMobileImage}
          fetchPriority="high"
          media="(max-width: 640px)"
        />
      ) : null}
      <Hero settings={heroSettings} />

      {/* Todo lo que sigue va en .page-reveal: fondo opaco + encima del Hero
          en el stacking order, así al scrollear sube y lo tapa en vez de
          dejarlo asomar por los costados (ver .hero-pin/.hero en globals.css). */}
      <div className="page-reveal">
        <QuickCategories categories={categories} />
        <ValueProps settings={valuePropsSettings} />

        {/* Nuevos ingresos: solo cuando el admin la activa (mucho stock nuevo cargado) */}
        {homeSettings.showNewArrivals && nuevos.length > 0 ? (
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
              <ProductGrid products={nuevos} tags={tags} />
            </div>
          </section>
        ) : null}

        <CategoryGrid categories={categories} products={products} />
        <OffersSection products={products} tags={tags} />
        <DtfSection settings={dtfSettings} products={dtfProducts} tags={tags} />

        {/* Más vendidos */}
        {homeSettings.showBestSellers && populares.length > 0 ? (
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
              <ProductGrid products={populares} tags={tags} />
            </div>
          </section>
        ) : null}

        {/* Combos: franja configurable desde Generales -> Secciones de la home, misma ubicación que "Más vendidos". */}
        {homeSettings.combos.enabled && combosCategory && combos.length > 0 ? (
          <section className="section section--soft">
            <div className="container">
              <div className="section-head">
                <div>
                  <span className="label section-head__eyebrow">
                    Más equipación por menos
                  </span>
                  <h2 className="h1">{combosCategory.name}</h2>
                </div>
                <Link
                  href={`/categoria/${categorySlugPath(categories, combosCategory.slug).join("/")}`}
                  className="section-head__link"
                >
                  Ver todos los combos
                </Link>
              </div>
              <ProductGrid products={combos} tags={tags} />
            </div>
          </section>
        ) : null}

        <CustomBanner settings={customBannerSettings} compact />

        <ReviewsSection settings={reviewsSettings} />

        {/* Cierre de la home: invita a /mayorista, independiente del
            mensaje flotante (ver WhatsAppTeaser.tsx) -- se activa aparte
            desde Generales -> Mayorista. */}
        {wholesaleSettings.homeBannerEnabled ? (
          <section className="section wholesale-cta">
            <div className="container">
              <div className="wholesale-cta__inner">
                <div>
                  <span className="label wholesale-cta__eyebrow">
                    {wholesaleSettings.homeBannerEyebrow}
                  </span>
                  <h2 className="h1">{wholesaleSettings.homeBannerTitle}</h2>
                </div>
                <Link href={wholesaleSettings.teaserHref || "/mayorista"} className="btn btn--light">
                  {wholesaleSettings.homeBannerCtaLabel}
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
