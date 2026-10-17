"use client";

import { useRef, type CSSProperties } from "react";
import Link from "next/link";
import type { Product, Tag } from "@/lib/catalog";
import type { DtfSettings } from "@/lib/settings";
import { imageVariant } from "@/lib/image";
import { ProductCard } from "@/components/product/ProductCard";
import { IconChevron } from "@/components/ui/Icons";

export function DtfSection({
  settings,
  products,
  tags = [],
}: {
  settings: DtfSettings;
  products: Product[];
  tags?: Tag[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: "smooth" });
  };

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
          <div className="hscroll__track" ref={trackRef}>
            {products.map((product) => (
              <div key={product.id} className="dtf-card">
                <ProductCard product={product} tags={tags} badge="Bajo pedido" />
              </div>
            ))}
          </div>

          {products.length > 1 ? (
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
