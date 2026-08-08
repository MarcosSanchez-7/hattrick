import Link from "next/link";
import { byCategory, type Category, type Product } from "@/lib/catalog";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconArrow } from "@/components/ui/Icons";

export function CategoryGrid({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="label section-head__eyebrow">Catálogo</span>
            <h2 className="h1">Compra por categoría</h2>
          </div>
          <p className="lead" style={{ maxWidth: "40ch", fontSize: "0.9375rem" }}>
            {categories.length} secciones, un mismo estándar de calidad. Todo
            el catálogo está organizado por tipo de producto y por liga.
          </p>
        </div>

        <div className="cats">
          {categories.map((cat) => {
            const inCategory = byCategory(products, cat.slug);
            const cover = inCategory[0];
            return (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                className="cats__card"
              >
                <div>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <h3 className="h2">{cat.name}</h3>
                    <span className="cats__count">
                      {inCategory.length} artículos
                    </span>
                  </div>
                  <p className="meta" style={{ marginTop: 6, maxWidth: "34ch" }}>
                    {cat.tagline}
                  </p>
                </div>
                {cat.image ? (
                  <div className="cats__art">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.image} alt={cat.name} />
                  </div>
                ) : cover ? (
                  <div className="cats__art">
                    <ProductVisual
                      images={cover.images}
                      colors={cover.colors}
                      pattern={cover.pattern}
                      uid={`cat-${cat.slug}`}
                      alt={cat.name}
                    />
                  </div>
                ) : null}
                <span className="cats__go">
                  Explorar
                  <IconArrow className="icon--sm" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
