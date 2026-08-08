import Link from "next/link";
import { getProduct, type Product } from "@/lib/catalog";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconArrow } from "@/components/ui/Icons";

const STATS = [
  ["120+", "Equipaciones en stock"],
  ["48 h", "Entrega península"],
  ["4,9/5", "1.240 valoraciones"],
];

export function Hero({ products }: { products: Product[] }) {
  const featured = getProduct(products, "espana-local-2026") ?? products[0];

  return (
    <section className="hero">
      <div className="container hero__grid">
        <div className="hero__copy">
          <span className="label hero__eyebrow">Temporada 25/26 · Mundial 2026</span>
          <h1 className="display">
            La camiseta
            <br />
            hace al equipo
          </h1>
          <p className="lead">
            Equipaciones oficiales de clubes y selecciones, reediciones retro y
            personalización profesional con el tipo de letra de cada liga. Sin
            réplicas, sin sorpresas.
          </p>
          <div className="hero__actions">
            <Link href="/novedades" className="btn">
              Comprar novedades
              <IconArrow className="icon--sm" />
            </Link>
            <Link href="/ofertas" className="btn btn--ghost">
              Ver ofertas
            </Link>
          </div>
          <div className="hero__stats">
            {STATS.map(([value, label]) => (
              <div key={label}>
                <div className="hero__stat-value">{value}</div>
                <div className="meta">{label}</div>
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
