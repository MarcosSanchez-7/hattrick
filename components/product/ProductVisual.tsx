import type { Pattern } from "@/lib/catalog";
import { imageVariant, type ImageSize } from "@/lib/image";
import { JerseyArt } from "@/components/product/JerseyArt";

type Props = {
  images?: string[];
  imageIndex?: number;
  colors: { primary: string; secondary: string; accent: string };
  pattern: Pattern;
  uid: string;
  number?: string;
  alt: string;
  className?: string;
  /** true = probable LCP (hero, imagen principal de producto): carga eager y con prioridad. Default: lazy. */
  priority?: boolean;
  /** Qué variante de tamaño pedir (ver lib/image.ts) — "card" para grillas
   * (default), "thumb" para miniaturas/admin, "full" para la imagen grande
   * real de la ficha de producto. */
  size?: ImageSize;
};

/** Foto subida desde el panel si existe; si no, ilustración SVG generada. */
export function ProductVisual({
  images,
  imageIndex = 0,
  colors,
  pattern,
  uid,
  number,
  alt,
  className,
  priority = false,
  size = "card",
}: Props) {
  const src = images?.[imageIndex];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={imageVariant(src, size)}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
      />
    );
  }
  return (
    <JerseyArt
      colors={colors}
      pattern={pattern}
      uid={uid}
      number={number}
      className={className}
    />
  );
}
