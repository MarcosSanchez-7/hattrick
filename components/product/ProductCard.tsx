"use client";

import Link from "next/link";
import {
  CONSULT_SIZE_LABEL,
  discountPercent,
  isOnSale,
  isSoldOut,
  needsSizeSelection,
  type Product,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/components/cart/CartProvider";
import { ProductVisual } from "@/components/product/ProductVisual";
import { IconStar } from "@/components/ui/Icons";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const sale = isOnSale(product);
  const requiresSize = needsSizeSelection(product);
  const soldOut = product.soldOut ?? [];
  const allSoldOut = isSoldOut(product);

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
          aria-label={`${product.team} — ${product.name}`}
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        />

        <ProductVisual
          images={product.images}
          colors={product.colors}
          pattern={product.pattern}
          uid={product.id}
          alt={`${product.team} — ${product.name}`}
        />

        <div className="card__quick">
          <div
            style={{
              background: "var(--surface)",
              borderTop: "1px solid var(--line)",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              position: "relative",
              zIndex: 2,
            }}
          >
            <span
              className="label"
              style={{ color: "var(--ink-muted)", flex: "none" }}
            >
              Añadir
            </span>
            {requiresSize ? (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {product.sizes.map((size) => {
                  const out = soldOut.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={out}
                      onClick={() => add(product, size)}
                      title={
                        out ? `Talla ${size} agotada` : `Añadir talla ${size}`
                      }
                      style={{
                        minWidth: 30,
                        height: 26,
                        padding: "0 6px",
                        fontSize: 11,
                        fontWeight: 600,
                        border: "1px solid var(--line)",
                        color: out ? "var(--ink-muted)" : "var(--ink)",
                        textDecoration: out ? "line-through" : "none",
                        cursor: out ? "not-allowed" : "pointer",
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => add(product, CONSULT_SIZE_LABEL)}
                style={{
                  height: 26,
                  padding: "0 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
              >
                Añadir
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card__body">
        <span className="card__team">{product.team}</span>
        <Link href={`/producto/${product.slug}`} className="card__name">
          {product.name}
        </Link>
        <span className="rating">
          <IconStar className="icon--sm" />
          {product.rating.toFixed(1)}
          <span style={{ opacity: 0.7 }}>({product.reviews})</span>
        </span>
        <div className="card__prices">
          <span className={`price${sale ? " price--sale" : ""}`}>
            {formatPrice(product.price)}
          </span>
          {sale ? (
            <span className="price--old">{formatPrice(product.compareAt!)}</span>
          ) : null}
        </div>
        <div className="card__swatches" aria-hidden="true">
          <span
            className="swatch"
            style={{ background: product.colors.primary }}
          />
          <span
            className="swatch"
            style={{ background: product.colors.secondary }}
          />
          <span
            className="swatch"
            style={{ background: product.colors.accent }}
          />
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
