import Link from "next/link";
import { discountPercent, isOnSale, isSoldOut, type Product, type Tag } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { readableTextColor } from "@/lib/color";
import { ProductVisual } from "@/components/product/ProductVisual";
import { ProductCardMedia } from "@/components/product/ProductCardMedia";
import { WishlistHeartButton } from "@/components/wishlist/WishlistHeartButton";
import { QuickAddButton } from "@/components/cart/QuickAddButton";

export function ProductCard({ product, tags = [] }: { product: Product; tags?: Tag[] }) {
  const sale = isOnSale(product);
  const allSoldOut = isSoldOut(product);
  const hasSecondImage = (product.images?.length ?? 0) > 1;
  const alt = product.name;

  return (
    <article className="card">
      <ProductCardMedia
        hasSecondImage={hasSecondImage}
        images={product.images}
        colors={product.colors}
        pattern={product.pattern}
        uid={product.id}
        alt={alt}
      >
        <div className="card__badges">
          {product.isNew ? <span className="badge">Nuevo</span> : null}
          {sale ? (
            <span className="badge badge--sale">
              −{discountPercent(product)}%
            </span>
          ) : null}
          {allSoldOut ? <span className="badge badge--out">Agotado</span> : null}
          {product.tags.map((tag) => {
            const color = tags.find((t) => t.name === tag)?.color;
            return (
              <span
                key={tag}
                className="badge badge--tag"
                style={color ? { background: color, color: readableTextColor(color) } : undefined}
              >
                {tag}
              </span>
            );
          })}
        </div>

        <WishlistHeartButton product={product} className="wishlist-heart--card" />
        <QuickAddButton product={product} className="quick-add--card" />

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
      </ProductCardMedia>

      <div className="card__body">
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
  tags = [],
  columns = 4,
}: {
  products: Product[];
  tags?: Tag[];
  columns?: 3 | 4;
}) {
  return (
    <div className={columns === 3 ? "grid-products grid-products--3" : "grid-products"}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} tags={tags} />
      ))}
    </div>
  );
}
