import Link from "next/link";
import { onSaleProducts, type Product } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductCard";
import { Countdown } from "@/components/home/Countdown";

export function OffersSection({ products }: { products: Product[] }) {
  const onSale = onSaleProducts(products).slice(0, 4);
  if (onSale.length === 0) return null;

  return (
    <section className="section offers" id="ofertas">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="label section-head__eyebrow">
              Hasta −25 % · Stock limitado
            </span>
            <h2 className="h1">Ofertas de la semana</h2>
          </div>
          <Countdown />
        </div>

        <ProductGrid products={onSale} />

        <div style={{ marginTop: 48, display: "flex", justifyContent: "center" }}>
          <Link href="/ofertas" className="btn btn--light">
            Ver todas las ofertas
          </Link>
        </div>
      </div>
    </section>
  );
}
