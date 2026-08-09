import Link from "next/link";
import { getProduct, type Product } from "@/lib/catalog";
import type { HeroSettings } from "@/lib/settings";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconArrow } from "@/components/ui/Icons";

export function Hero({
  products,
  settings,
}: {
  products: Product[];
  settings: HeroSettings;
}) {
  const featured =
    (settings.featuredProductSlug
      ? getProduct(products, settings.featuredProductSlug)
      : undefined) ?? products[0];

  return (
    <section className="hero">
      <div className="container hero__grid">
        <div className="hero__copy">
          <span className="label hero__eyebrow">{settings.eyebrow}</span>
          <h1 className="display">
            {settings.headlineLine1}
            <br />
            {settings.headlineLine2}
          </h1>
          <p className="lead">{settings.lead}</p>
          <div className="hero__actions">
            <Link href={settings.primaryCtaHref} className="btn">
              {settings.primaryCtaLabel}
              <IconArrow className="icon--sm" />
            </Link>
            <Link href={settings.secondaryCtaHref} className="btn btn--ghost">
              {settings.secondaryCtaLabel}
            </Link>
          </div>
          <div className="hero__stats">
            {settings.stats.map((stat) => (
              <div key={stat.label}>
                <div className="hero__stat-value">{stat.value}</div>
                <div className="meta">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero__visual">
          {featured ? (
            <>
              <ProductVisual
                images={featured.images}
                colors={featured.colors}
                pattern={featured.pattern}
                uid="hero"
                number="10"
                alt={`${featured.team} — ${featured.name}`}
              />
              <Link href={`/producto/${featured.slug}`} className="hero__visual-tag">
                <div className="label" style={{ color: "var(--ink-muted)" }}>
                  Lanzamiento
                </div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>
                  {featured.team} · {featured.name}
                </div>
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
