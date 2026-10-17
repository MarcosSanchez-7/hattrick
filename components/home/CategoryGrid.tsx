"use client";

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
import { useLoopCarousel } from "@/components/home/useLoopCarousel";

export function CategoryGrid({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const topCategories = topLevelCategories(categories);
  const loop = topCategories.length > 1;
  // x3 para el loop infinito (ver useLoopCarousel) -- con 1 sola categoría
  // no tiene sentido triplicar, no hay nada que recorrer.
  const items = loop ? [...topCategories, ...topCategories, ...topCategories] : topCategories;
  const { trackRef, handleScroll, scrollBy } = useLoopCarousel(items);

  const coverOf = (cat: Category) => {
    const inCategory = byCategoryTree(products, categories, cat.slug);
    return inCategory[0];
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
          <div className="hscroll__track" ref={trackRef} onScroll={loop ? handleScroll : undefined}>
            {items.map((cat, i) => {
              const cover = coverOf(cat);
              return (
                <Link
                  key={`${cat.slug}-${i}`}
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
                        uid={`cat-${cat.slug}-${i}`}
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

          {loop ? (
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
