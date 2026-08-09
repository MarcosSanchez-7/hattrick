"use client";

import { useState } from "react";
import {
  CONSULT_SIZE_LABEL,
  discountPercent,
  isOnSale,
  needsSizeSelection,
  type Product,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_FROM, useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { ProductVisual } from "@/components/product/ProductVisual";
import {
  IconChevron,
  IconHeart,
  IconPrint,
  IconReturn,
  IconStar,
  IconTruck,
} from "@/components/ui/Icons";

/** Nº de vistas generadas cuando el producto no tiene fotos reales. */
const GENERATED_VIEWS = 3;
const PERSONALIZATION_PRICE = 120000;
const EXPRESS_SHIPPING_PRICE = 80000;

export function ProductDetail({ product }: { product: Product }) {
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
  const alt = `${product.team} — ${product.name}`;

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
          />
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
          <span className="card__team">{product.team}</span>
          <h1 className="h1" style={{ marginTop: 6 }}>
            {product.name}
          </h1>
          <div className="row gap-3" style={{ marginTop: 10 }}>
            <span className="rating">
              <IconStar className="icon--sm" />
              {product.rating.toFixed(1)}
              <span style={{ opacity: 0.7 }}>({product.reviews} reseñas)</span>
            </span>
            <span className="meta">·</span>
            <span className="meta">
              {product.league} · {product.season}
            </span>
          </div>
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
        <p className="meta">IVA incluido. Envío calculado en el checkout.</p>

        <div>
          <div
            className="row"
            style={{ justifyContent: "space-between", marginBottom: 10 }}
          >
            <span className="label">Talla</span>
            {requiresSize ? (
              <button type="button" className="meta link-underline">
                Guía de tallas
              </button>
            ) : null}
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

        <div className="stack gap-2">
          <div className="notice">
            <IconTruck className="icon--sm" />
            <span>
              Entrega estimada en 48 h · Gratis desde {formatPrice(FREE_SHIPPING_FROM)}
            </span>
          </div>
          <div className="notice">
            <IconPrint className="icon--sm" />
            <span>
              Personalización oficial disponible desde {formatPrice(PERSONALIZATION_PRICE)}
            </span>
          </div>
          <div className="notice">
            <IconReturn className="icon--sm" />
            <span>30 días para cambiar la talla sin coste</span>
          </div>
        </div>

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
            id="detalles"
            title="Detalles y composición"
            open={open}
            setOpen={setOpen}
          >
            <dl className="specs">
              <div>
                <dt>Equipo</dt>
                <dd>{product.team}</dd>
              </div>
              <div>
                <dt>Competición</dt>
                <dd>{product.league}</dd>
              </div>
              <div>
                <dt>Temporada</dt>
                <dd>{product.season}</dd>
              </div>
              <div>
                <dt>Referencia</dt>
                <dd>{product.id.toUpperCase()}-{product.season.replace("/", "")}</dd>
              </div>
              <div>
                <dt>Material</dt>
                <dd>100 % poliéster reciclado</dd>
              </div>
              <div>
                <dt>Corte</dt>
                <dd>Versión hincha, regular</dd>
              </div>
            </dl>
          </Accordion>
          <Accordion
            id="envios"
            title="Envíos y devoluciones"
            open={open}
            setOpen={setOpen}
          >
            Envío estándar en 48 h laborables (gratuito a partir de{" "}
            {formatPrice(FREE_SHIPPING_FROM)}) y express en 24 h por{" "}
            {formatPrice(EXPRESS_SHIPPING_PRICE)}. Devoluciones y cambios de
            talla gratuitos durante 30 días, salvo en artículos
            personalizados.
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
