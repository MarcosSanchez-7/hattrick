import type { CSSProperties } from "react";
import Link from "next/link";
import {
  byCategoryTree,
  topLevelCategories,
  type Category,
  type Product,
} from "@/lib/catalog";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconArrow } from "@/components/ui/Icons";

type CardSpan = { colSpan: 1 | 2 | 3; rowSpan: 1 | 2 };

/**
 * Reparte las tarjetas en el grid de 3 columnas de forma que nunca quede
 * ninguna "flotando" sola en la última fila — el tamaño de cada una depende
 * de cuántas categorías haya en total, no de una posición fija.
 *
 * La tarjeta grande (hero) solo se usa cuando el total es múltiplo de 3
 * (hero + 2 tarjetas chicas al lado llenan exactamente 2 filas): con
 * cualquier otra cantidad, todas quedan del mismo tamaño y, si sobra 1 o 2
 * al final, esas ocupan todo el ancho de la fila en vez de dejar huecos.
 */
function planCategoryGrid(n: number): CardSpan[] {
  const plan: CardSpan[] = [];
  const useHero = n >= 3 && n % 3 === 0;
  let remaining = n;

  if (useHero) {
    plan.push(
      { colSpan: 2, rowSpan: 2 },
      { colSpan: 1, rowSpan: 1 },
      { colSpan: 1, rowSpan: 1 },
    );
    remaining -= 3;
  }

  const fullRows = Math.floor(remaining / 3);
  for (let i = 0; i < fullRows * 3; i++) {
    plan.push({ colSpan: 1, rowSpan: 1 });
  }

  const rest = remaining % 3;
  if (rest === 1) {
    plan.push({ colSpan: 3, rowSpan: 1 });
  } else if (rest === 2) {
    plan.push({ colSpan: 2, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 });
  }

  return plan;
}

export function CategoryGrid({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const topCategories = topLevelCategories(categories);
  const spans = planCategoryGrid(topCategories.length);

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

        <div className="cats">
          {topCategories.map((cat, i) => {
            const inCategory = byCategoryTree(products, categories, cat.slug);
            const cover = inCategory[0];
            const span = spans[i] ?? { colSpan: 1, rowSpan: 1 };
            const cardStyle = {
              "--col-span": span.colSpan,
              "--row-span": span.rowSpan,
            } as CSSProperties;
            return (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                className="cats__card"
                style={cardStyle}
              >
                <div className="cats__art">
                  {cat.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.image} alt={cat.name} />
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
                  <span className="label cats__eyebrow">Colección</span>
                  <h3 className="h2">{cat.name}</h3>
                  <p className="meta">{cat.tagline}</p>
                  <span className="cats__go">
                    Explorar
                    <IconArrow className="icon--sm" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
