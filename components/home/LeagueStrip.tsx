import Link from "next/link";
import { LEAGUES, type Product } from "@/lib/catalog";

export function LeagueStrip({ products }: { products: Product[] }) {
  return (
    <section className="section section--tight">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="label section-head__eyebrow">Competiciones</span>
            <h2 className="h1">Elige tu liga</h2>
          </div>
        </div>
        <div className="leagues">
          {LEAGUES.map((league) => {
            const total = products.filter((p) => p.league === league).length;
            return (
              <Link
                key={league}
                href={`/buscar?q=${encodeURIComponent(league)}`}
                className="leagues__item"
              >
                <div className="leagues__name">{league}</div>
                <div className="meta" style={{ color: "inherit", opacity: 0.6 }}>
                  {total} modelos
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
