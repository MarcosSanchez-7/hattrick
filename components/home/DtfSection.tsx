"use client";

import { type CSSProperties } from "react";
import Link from "next/link";
import type { Product, Tag } from "@/lib/catalog";
import type { DtfSettings } from "@/lib/settings";
import { imageVariant } from "@/lib/image";
import { ProductCard } from "@/components/product/ProductCard";
import { IconChevron } from "@/components/ui/Icons";
import { useLoopCarousel } from "@/components/home/useLoopCarousel";

export function DtfSection({
  settings,
  products,
  tags = [],
}: {
  settings: DtfSettings;
  products: Product[];
  tags?: Tag[];
}) {
  const loop = products.length > 1;
  // x3 para el loop infinito (ver useLoopCarousel).
  const items = loop ? [...products, ...products, ...products] : products;
  const { trackRef, handleScroll, scrollBy } = useLoopCarousel(items);

  if (products.length === 0) return null;

  const style = settings.backgroundImage
    ? ({ "--dtf-bg": `url(${imageVariant(settings.backgroundImage, "full")})` } as CSSProperties)
    : undefined;

  return (
    <section className="section dtf" style={style} data-has-bg={settings.backgroundImage ? "true" : "false"}>
      <div className="dtf__bg" />
      <div className="container">
        <div className="section-head">
          <div>
            <span className="label section-head__eyebrow">{settings.eyebrow}</span>
            <h2 className="h1">{settings.title}</h2>
            {settings.lead ? <p className="lead">{settings.lead}</p> : null}
          </div>
          {settings.ctaLabel ? (
            <Link href={settings.ctaHref || "#"} className="btn btn--light">
              {settings.ctaLabel}
            </Link>
          ) : null}
        </div>

        <div className="hscroll">
          <div className="hscroll__track" ref={trackRef} onScroll={loop ? handleScroll : undefined}>
            {items.map((product, i) => (
              <div key={`${product.id}-${i}`} className="dtf-card">
                <ProductCard product={product} tags={tags} badge="Bajo pedido" />
              </div>
            ))}
          </div>

          {loop ? (
            <>
              <button
                type="button"
                className="hscroll__nav hscroll__nav--prev"
                onClick={() => scrollBy(-1)}
                aria-label="Productos anteriores"
              >
                <IconChevron className="icon--sm" />
              </button>
              <button
                type="button"
                className="hscroll__nav hscroll__nav--next"
                onClick={() => scrollBy(1)}
                aria-label="Productos siguientes"
              >
                <IconChevron className="icon--sm" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
