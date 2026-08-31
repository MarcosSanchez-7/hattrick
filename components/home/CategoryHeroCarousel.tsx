"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Pattern } from "@/lib/catalog";
import { imageVariant } from "@/lib/image";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconArrow, IconChevron } from "@/components/ui/Icons";

const AUTOPLAY_MS = 3000;

export type HeroCategorySlide = {
  slug: string;
  name: string;
  tagline: string;
  image: string | null;
  cover: {
    images?: string[];
    colors: { primary: string; secondary: string; accent: string };
    pattern: Pattern;
  } | null;
};

/**
 * Espacio grande del bento de categorías: si hay más categorías que
 * lugares fijos en la grilla, las que sobran rotan acá en vez de romper
 * el diseño estandarizado (hero + 5 tarjetas). Con una sola diapositiva
 * se comporta como una tarjeta normal, sin flechas ni autoplay.
 */
export function CategoryHeroCarousel({ slides }: { slides: HeroCategorySlide[] }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count]);

  const goTo = (i: number) => setIndex((i + count) % count);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <div className="cats__card cats__card--hero">
      <Link href={`/categoria/${slide.slug}`} className="cats__hero-link">
        <div className="cats__art">
          {slide.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageVariant(slide.image, "full")} alt={slide.name} loading="lazy" />
          ) : slide.cover ? (
            <ProductVisual
              images={slide.cover.images}
              colors={slide.cover.colors}
              pattern={slide.cover.pattern}
              uid={`cat-hero-${slide.slug}`}
              alt={slide.name}
              size="full"
            />
          ) : null}
        </div>
        <div className="cats__overlay" />
        <div className="cats__content">
          <span className="label cats__eyebrow">Colección</span>
          <h3 className="h2">{slide.name}</h3>
          <p className="meta">{slide.tagline}</p>
          <span className="cats__go">
            Explorar
            <IconArrow className="icon--sm" />
          </span>
        </div>
      </Link>

      {count > 1 ? (
        <>
          <button
            type="button"
            className="pdp__nav pdp__nav--prev"
            onClick={() => goTo(index - 1)}
            aria-label="Categoría anterior"
          >
            <IconChevron className="icon--sm" />
          </button>
          <button
            type="button"
            className="pdp__nav pdp__nav--next"
            onClick={() => goTo(index + 1)}
            aria-label="Categoría siguiente"
          >
            <IconChevron className="icon--sm" />
          </button>
          <div className="hero__dots">
            {slides.map((s, i) => (
              <button
                key={s.slug}
                type="button"
                className="hero__dot hero__dot--dark"
                data-active={i === index ? "true" : "false"}
                onClick={() => setIndex(i)}
                aria-label={`Ver categoría ${s.name}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
