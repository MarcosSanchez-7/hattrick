import Link from "next/link";
import {
  byCategoryTree,
  topLevelCategories,
  type Category,
  type Product,
} from "@/lib/catalog";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconArrow } from "@/components/ui/Icons";

export function CategoryGrid({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const topCategories = topLevelCategories(categories);

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
          {topCategories.map((cat) => {
            const inCategory = byCategoryTree(products, categories, cat.slug);
            const cover = inCategory[0];
            return (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                className="cats__card"
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
