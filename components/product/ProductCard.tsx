import Link from "next/link";
import { discountPercent, isOnSale, isSoldOut, type Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { ProductVisual } from "@/components/product/ProductVisual";

export function ProductCard({ product }: { product: Product }) {
  const sale = isOnSale(product);
  const allSoldOut = isSoldOut(product);
  const hasSecondImage = (product.images?.length ?? 0) > 1;
  const alt = `${product.team} — ${product.name}`;

  return (
    <article className="card">
      <div className="card__media">
        <div className="card__badges">
          {product.isNew ? <span className="badge">Nuevo</span> : null}
          {sale ? (
            <span className="badge badge--sale">
              −{discountPercent(product)}%
            </span>
          ) : null}
          {allSoldOut ? <span className="badge badge--out">Agotado</span> : null}
        </div>

        <Link
          href={`/producto/${product.slug}`}
          aria-label={alt}
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        />

        <ProductVisual
          images={product.images}
          imageIndex={0}
          colors={product.colors}
          pattern={product.pattern}
          uid={product.id}
          alt={alt}
        />
        {hasSecondImage ? (
          <ProductVisual
            images={product.images}
            imageIndex={1}
            colors={product.colors}
            pattern={product.pattern}
            uid={`${product.id}-hover`}
            alt={alt}
            className="card__media-hover"
          />
        ) : null}
      </div>

      <div className="card__body">
        <span className="card__team">{product.team}</span>
        <Link href={`/producto/${product.slug}`} className="card__name">
          {product.name}
        </Link>
        <div className="card__prices">
          <span className={`price${sale ? " price--sale" : ""}`}>
            {formatPrice(product.price)}
          </span>
          {sale ? (
            <span className="price--old">{formatPrice(product.compareAt!)}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  columns = 4,
}: {
  products: Product[];
  columns?: 3 | 4;
}) {
  return (
    <div className={columns === 3 ? "grid-products grid-products--3" : "grid-products"}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
