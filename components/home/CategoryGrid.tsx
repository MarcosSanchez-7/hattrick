"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  byCategoryTree,
  topLevelCategories,
  type Category,
  type Product,
} from "@/lib/catalog";
import { imageVariant } from "@/lib/image";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconArrow, IconChevron } from "@/components/ui/Icons";

export function CategoryGrid({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const topCategories = topLevelCategories(categories);

  const coverOf = (cat: Category) => {
    const inCategory = byCategoryTree(products, categories, cat.slug);
    return inCategory[0];
  };

  const scrollBy = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="label section-head__eyebrow">Catálogo</span>
            <h2 className="h1">Compra por categoría</h2>
          </div>
          <p className="lead" style={{ maxWidth: "40ch", fontSize: "0.9375rem" }}>
            {topCategories.length} secciones, un mismo estándar de calidad.
            Todo el catálogo está organizado por tipo de producto.
          </p>
        </div>

        <div className="hscroll">
          <div className="hscroll__track" ref={trackRef}>
            {topCategories.map((cat) => {
              const cover = coverOf(cat);
              return (
                <Link
                  key={cat.slug}
                  href={`/categoria/${cat.slug}`}
                  className="cats__card cats__card--carousel"
                >
                  <div className="cats__art">
                    {cat.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageVariant(cat.image, "card")}
                        alt={cat.name}
                        loading="lazy"
                      />
                    ) : cover ? (
                      <ProductVisual
                        images={cover.images}
                        colors={cover.colors}
                        pattern={cover.pattern}
                        uid={`cat-${cat.slug}`}
                        alt={cat.name}
                      />
                    ) : null}
                  </div>
                  <div className="cats__overlay" />
                  <div className="cats__content">
                    <h3 className="h2">{cat.name}</h3>
                    {cat.tagline ? <p className="meta">{cat.tagline}</p> : null}
                    <span className="cats__go">
                      Explorar
                      <IconArrow className="icon--sm" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {topCategories.length > 1 ? (
            <>
              <button
                type="button"
                className="hscroll__nav hscroll__nav--prev"
                onClick={() => scrollBy(-1)}
                aria-label="Categorías anteriores"
              >
                <IconChevron className="icon--sm" />
              </button>
              <button
                type="button"
                className="hscroll__nav hscroll__nav--next"
                onClick={() => scrollBy(1)}
                aria-label="Categorías siguientes"
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
