"use client";

import { useState, type ReactNode } from "react";
import type { Pattern } from "@/lib/catalog";
import { ProductVisual } from "@/components/product/ProductVisual";

type Props = {
  children: ReactNode;
  hasSecondImage: boolean;
  images?: string[];
  colors: { primary: string; secondary: string; accent: string };
  pattern: Pattern;
  uid: string;
  alt: string;
};

/** La segunda foto (swap al hover) antes se precargaba siempre junto con la
 * principal (loading="lazy" no evita la descarga si el elemento ya está en
 * viewport, solo opacity:0). Ahora recién se pide a Blob cuando el usuario
 * interactúa de verdad con la card — duplicaba la transferencia de cada
 * grilla de categoría/home sin necesidad. */
export function ProductCardMedia({
  children,
  hasSecondImage,
  images,
  colors,
  pattern,
  uid,
  alt,
}: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className="card__media"
      onMouseEnter={() => setRevealed(true)}
      onFocus={() => setRevealed(true)}
      onTouchStart={() => setRevealed(true)}
    >
      {children}
      {hasSecondImage && revealed ? (
        <ProductVisual
          images={images}
          imageIndex={1}
          colors={colors}
          pattern={pattern}
          uid={`${uid}-hover`}
          alt={alt}
          className="card__media-hover"
        />
      ) : null}
    </div>
  );
}
