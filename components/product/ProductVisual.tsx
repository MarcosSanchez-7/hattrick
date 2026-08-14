import type { Pattern } from "@/lib/catalog";
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
}: Props) {
  const src = images?.[imageIndex];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
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
