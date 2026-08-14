import type { Metadata } from "next";
import Link from "next/link";
import { bestSellers, newArrivals } from "@/lib/catalog";
import { getAllCategories, getAllProducts, getAllTags, getSetting } from "@/lib/data";
import {
  DEFAULT_CUSTOM_BANNER,
  DEFAULT_HERO,
  DEFAULT_HOME,
  DEFAULT_VALUE_PROPS,
} from "@/lib/settings";
import { Hero } from "@/components/home/Hero";
import { ValueProps } from "@/components/home/ValueProps";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { OffersSection } from "@/components/home/OffersSection";
import { CustomBanner } from "@/components/home/CustomBanner";
import { ProductGrid } from "@/components/product/ProductCard";

export const dynamic = "force-dynamic";

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
  ] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
    getAllTags(),
    getSetting("hero", DEFAULT_HERO),
    getSetting("customBanner", DEFAULT_CUSTOM_BANNER),
    getSetting("home", DEFAULT_HOME),
    getSetting("valueProps", DEFAULT_VALUE_PROPS),
  ]);
  const nuevos = newArrivals(products).slice(0, 8);
  const populares = bestSellers(products).slice(0, 4);
  const firstSlideImage = heroSettings.slides[0]?.image;

  return (
    <>
      {/* El Hero pinta la primera imagen como background-image en CSS (no
          <img>), así que no hay atributo loading/fetchPriority que setear
          ahí — este preload es la forma de darle prioridad de carga al
          candidato más probable a LCP del home. */}
      {firstSlideImage ? (
        <link rel="preload" as="image" href={firstSlideImage} fetchPriority="high" />
      ) : null}
      <Hero settings={heroSettings} />
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

      <OffersSection products={products} tags={tags} />
      <CategoryGrid categories={categories} products={products} />

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
            <ProductGrid products={populares} tags={tags} />
          </div>
        </section>
      ) : null}

      <CustomBanner settings={customBannerSettings} />

      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <h2 className="h2">Camisetas de fútbol en Paraguay</h2>
          <p className="lead" style={{ marginTop: 12 }}>
            En HATTRICK encontrás camisetas de clubes paraguayos como Cerro
            Porteño y Olimpia, equipos europeos, selecciones camino al
            Mundial 2026 y ediciones retro para coleccionar. Todo el
            catálogo con talles disponibles, personalización oficial y
            stock real.
          </p>
          <p className="lead" style={{ marginTop: 12 }}>
            Hacemos envíos a todo Paraguay, con entrega gratuita desde Gs.
            640.000. Si tenés dudas sobre talles, stock o cómo hacer tu
            pedido, escribinos por WhatsApp y coordinamos todo directo con
            vos.
          </p>
        </div>
      </section>
    </>
  );
}
