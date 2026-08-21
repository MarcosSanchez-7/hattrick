"use client";

import { useState } from "react";
import {
  CONSULT_SIZE_LABEL,
  discountPercent,
  isOnSale,
  isPatchAvailable,
  needsSizeSelection,
  type NoticeIcon,
  type Patch,
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
  IconClose,
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
  personalizationPrice,
}: {
  product: Product;
  notices: ProductNotice[];
  productInfo: ProductInfoSettings;
  /** Precio único de personalización para todo el catálogo (Gs.). */
  personalizationPrice: number;
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

  const [customized, setCustomized] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [selectedPatchIds, setSelectedPatchIds] = useState<string[]>([]);
  const [previewPatch, setPreviewPatch] = useState<Patch | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const sale = isOnSale(product);
  const hasPhotos = (product.images?.length ?? 0) > 0;
  const thumbCount = hasPhotos ? product.images!.length : GENERATED_VIEWS;
  const alt = product.name;

  const goTo = (i: number) => setView((i + thumbCount) % thumbCount);

  const availablePatches = product.patches?.filter(isPatchAvailable) ?? [];
  const togglePatch = (id: string) => {
    setSelectedPatchIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };
  const selectedPatches = availablePatches.filter((p) => selectedPatchIds.includes(p.id));
  const openPatchPreview = (patch: Patch) => {
    setPreviewIndex(0);
    setPreviewPatch(patch);
  };
  const closePatchPreview = () => setPreviewPatch(null);
  const goToPreviewImage = (i: number) => {
    if (!previewPatch) return;
    const count = previewPatch.images.length;
    setPreviewIndex((i + count) % count);
  };
  const addOnsTotal =
    (customized ? personalizationPrice : 0) +
    selectedPatches.reduce((acc, p) => acc + p.price, 0);
  const unitTotal = product.price + addOnsTotal;
  const customizationComplete =
    !customized || (customName.trim() !== "" && customNumber.trim() !== "");
  const canAdd = Boolean(size) && customizationComplete;

  const handleAdd = () => {
    if (!size || !customizationComplete) return;
    add(product, size, 1, {
      note: customized ? `${customName.trim()} #${customNumber.trim()}` : null,
      patches: selectedPatches.map((p) => ({ name: p.name, price: p.price })),
      addOnsPerUnit: addOnsTotal,
    });
  };

  return (
    <>
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

        {product.isCustomizable || availablePatches.length > 0 ? (
          <div className="stack gap-2" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            {product.isCustomizable ? (
              <div>
                <label className="row gap-2" style={{ alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={customized}
                    onChange={(e) => setCustomized(e.target.checked)}
                  />
                  <span style={{ fontWeight: 600 }}>
                    PERSONALIZADO · +{formatPrice(personalizationPrice)}
                  </span>
                </label>
                {customized ? (
                  <div className="row gap-2" style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Nombre"
                      aria-label="Nombre a estampar"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="text"
                      value={customNumber}
                      onChange={(e) => setCustomNumber(e.target.value)}
                      placeholder="Número"
                      aria-label="Número a estampar"
                      style={{ width: 90 }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {availablePatches.length > 0 ? (
              <div>
                <span className="label">Parches</span>
                <div className="stack gap-2" style={{ marginTop: 8 }}>
                  {availablePatches.map((patch) => (
                    <div key={patch.id} className="row gap-2" style={{ alignItems: "center" }}>
                      {patch.images[0] ? (
                        <button
                          type="button"
                          className="patch-swatch"
                          onClick={() => openPatchPreview(patch)}
                          aria-label={`Ver el parche ${patch.name}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={patch.images[0]} alt="" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="size"
                        data-selected={selectedPatchIds.includes(patch.id) ? "true" : "false"}
                        onClick={() => togglePatch(patch.id)}
                      >
                        {patch.name} · +{formatPrice(patch.price)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="stack gap-2">
          <button
            type="button"
            className="btn btn--block"
            disabled={!canAdd}
            onClick={handleAdd}
          >
            {size ? `Añadir al carrito · ${formatPrice(unitTotal)}` : "Selecciona una talla"}
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

    {previewPatch ? (
      <>
        <button
          type="button"
          className="patch-preview-backdrop"
          aria-label="Cerrar vista previa"
          onClick={closePatchPreview}
        />
        <div className="patch-preview" role="dialog" aria-modal="true">
          <button
            type="button"
            className="nav__icon-btn patch-preview__close"
            onClick={closePatchPreview}
            aria-label="Cerrar"
          >
            <IconClose />
          </button>
          <div className="patch-preview__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewPatch.images[previewIndex]} alt={previewPatch.name} />
            {previewPatch.images.length > 1 ? (
              <>
                <button
                  type="button"
                  className="pdp__nav pdp__nav--prev"
                  onClick={() => goToPreviewImage(previewIndex - 1)}
                  aria-label="Imagen anterior del parche"
                >
                  <IconChevron className="icon--sm" />
                </button>
                <button
                  type="button"
                  className="pdp__nav pdp__nav--next"
                  onClick={() => goToPreviewImage(previewIndex + 1)}
                  aria-label="Imagen siguiente del parche"
                >
                  <IconChevron className="icon--sm" />
                </button>
              </>
            ) : null}
          </div>
          <p style={{ fontWeight: 600, marginTop: 12 }}>{previewPatch.name}</p>
          <p className="meta">+{formatPrice(previewPatch.price)}</p>
        </div>
      </>
    ) : null}
    </>
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
