"use client";

import { useState } from "react";
import {
  CONSULT_SIZE_LABEL,
  discountPercent,
  isOnSale,
  needsSizeSelection,
  type NoticeIcon,
  type Product,
  type ProductNotice,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { ProductInfoSettings } from "@/lib/settings";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { ProductVisual } from "@/components/product/ProductVisual";
import {
  IconChevron,
  IconHeart,
  IconPrint,
  IconReturn,
  IconShield,
  IconTruck,
} from "@/components/ui/Icons";

/** Nº de vistas generadas cuando el producto no tiene fotos reales. */
const GENERATED_VIEWS = 3;

const NOTICE_ICONS: Record<NoticeIcon, typeof IconTruck> = {
  truck: IconTruck,
  print: IconPrint,
  return: IconReturn,
  shield: IconShield,
};

export function ProductDetail({
  product,
  notices,
  productInfo,
}: {
  product: Product;
  notices: ProductNotice[];
  productInfo: ProductInfoSettings;
}) {
  const { add } = useCart();
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(product.slug);
  const requiresSize = needsSizeSelection(product);
  const soldOut = product.soldOut ?? [];
  const firstAvailable = product.sizes.find((s) => !soldOut.includes(s));
  const [size, setSize] = useState<string | undefined>(
    requiresSize ? firstAvailable : CONSULT_SIZE_LABEL,
  );
  const [view, setView] = useState(0);
  const [open, setOpen] = useState<string | null>("descripcion");

  const sale = isOnSale(product);
  const hasPhotos = (product.images?.length ?? 0) > 0;
  const thumbCount = hasPhotos ? product.images!.length : GENERATED_VIEWS;
  const alt = product.name;

  const goTo = (i: number) => setView((i + thumbCount) % thumbCount);

  return (
    <div className="container pdp">
      <div className="pdp__gallery">
        <div className="pdp__main">
          <ProductVisual
            images={product.images}
            imageIndex={view}
            colors={product.colors}
            pattern={product.pattern}
            uid={`pdp-${view}`}
            number={!hasPhotos && view === 1 ? "10" : undefined}
            alt={alt}
            priority
          />
          {thumbCount > 1 ? (
            <>
              <button
                type="button"
                className="pdp__nav pdp__nav--prev"
                onClick={() => goTo(view - 1)}
                aria-label="Imagen anterior"
              >
                <IconChevron className="icon--sm" />
              </button>
              <button
                type="button"
                className="pdp__nav pdp__nav--next"
                onClick={() => goTo(view + 1)}
                aria-label="Imagen siguiente"
              >
                <IconChevron className="icon--sm" />
              </button>
            </>
          ) : null}
        </div>
        {thumbCount > 1 ? (
          <div className="pdp__thumbs">
            {Array.from({ length: thumbCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                className="pdp__thumb"
                data-active={view === i ? "true" : "false"}
                onClick={() => setView(i)}
                aria-label={`Ver imagen ${i + 1}`}
              >
                <ProductVisual
                  images={product.images}
                  imageIndex={i}
                  colors={product.colors}
                  pattern={product.pattern}
                  uid={`thumb-${product.id}-${i}`}
                  number={!hasPhotos && i === 1 ? "10" : undefined}
                  alt={alt}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="pdp__info">
        <div>
          <h1 className="h1">{product.name}</h1>
        </div>

        <div className="pdp__price-row">
          <span className={`pdp__price${sale ? " price--sale" : ""}`}>
            {formatPrice(product.price)}
          </span>
          {sale ? (
            <>
              <span className="price--old">{formatPrice(product.compareAt!)}</span>
              <span className="badge badge--sale">
                −{discountPercent(product)}%
              </span>
            </>
          ) : null}
        </div>

        <div>
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="label">Talla</span>
          </div>
          {requiresSize ? (
            <>
              <div className="sizes">
                {product.sizes.map((s) => {
                  const out = soldOut.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className="size"
                      data-selected={size === s ? "true" : "false"}
                      disabled={out}
                      onClick={() => setSize(s)}
                      title={out ? "Agotada" : undefined}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {soldOut.length > 0 ? (
                <p className="meta" style={{ marginTop: 8 }}>
                  Tallas agotadas: {soldOut.join(", ")}. Te avisamos si vuelven.
                </p>
              ) : null}
            </>
          ) : (
            <span className="badge">Consultar talle</span>
          )}
        </div>

        <div className="stack gap-2">
          <button
            type="button"
            className="btn btn--block"
            disabled={!size}
            onClick={() => size && add(product, size)}
          >
            {size ? `Añadir al carrito · ${formatPrice(product.price)}` : "Selecciona una talla"}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            aria-pressed={saved}
            onClick={() => toggle(product)}
          >
            <IconHeart className="icon--sm wishlist-heart-icon" />
            {saved ? "Guardado en favoritos" : "Guardar en favoritos"}
          </button>
        </div>

        {notices.length > 0 ? (
          <div className="stack gap-2">
            {notices.map((notice, i) => {
              const Icon = NOTICE_ICONS[notice.icon];
              return (
                <div className="notice" key={i}>
                  <Icon className="icon--sm" />
                  <span>{notice.text}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="accordion">
          <Accordion
            id="descripcion"
            title="Descripción"
            open={open}
            setOpen={setOpen}
          >
            {product.description}
          </Accordion>
          <Accordion
            id="envios"
            title="Envíos y devoluciones"
            open={open}
            setOpen={setOpen}
          >
            {productInfo.shippingText}
          </Accordion>
        </div>
      </div>
    </div>
  );
}

function Accordion({
  id,
  title,
  open,
  setOpen,
  children,
}: {
  id: string;
  title: string;
  open: string | null;
  setOpen: (v: string | null) => void;
  children: React.ReactNode;
}) {
  const isOpen = open === id;
  return (
    <div className="accordion__item">
      <button
        type="button"
        className="accordion__head"
        aria-expanded={isOpen}
        onClick={() => setOpen(isOpen ? null : id)}
      >
        {title}
        <IconChevron className="icon--sm" />
      </button>
      {isOpen ? <div className="accordion__body">{children}</div> : null}
    </div>
  );
}
