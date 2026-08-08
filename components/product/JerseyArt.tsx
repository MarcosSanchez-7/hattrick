import type { Pattern } from "@/lib/catalog";

/**
 * Ilustración vectorial de la camiseta.
 * Sustituye a la fotografía de producto: se genera a partir de los colores y
 * el patrón de cada artículo, así que la tienda no depende de ningún binario.
 */

type Props = {
  colors: { primary: string; secondary: string; accent: string };
  pattern: Pattern;
  /** Identificador único: los <clipPath> deben tener id propio por instancia. */
  uid: string;
  /** Dorsal opcional impreso en el pecho. */
  number?: string;
  className?: string;
};

const OUTLINE =
  "M68 18 C78 44 122 44 132 18 L162 28 L186 64 L156 90 L146 78 L146 224 L54 224 L54 78 L44 90 L14 64 L38 28 Z";

export function JerseyArt({
  colors,
  pattern,
  uid,
  number,
  className,
}: Props) {
  const clipId = `jersey-clip-${uid}`;
  const shadeId = `jersey-shade-${uid}`;

  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      role="img"
      aria-label="Ilustración de la camiseta"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={OUTLINE} />
        </clipPath>
        <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.14" />
          <stop offset="22%" stopColor="#000" stopOpacity="0" />
          <stop offset="78%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="200" height="240" fill={colors.primary} />
        <PatternFill pattern={pattern} colors={colors} />
        <rect
          x="0"
          y="0"
          width="200"
          height="240"
          fill={`url(#${shadeId})`}
        />
        {/* Puños */}
        <rect x="0" y="74" width="200" height="7" fill={colors.accent} opacity="0.9" />
      </g>

      {/* Contorno y costuras */}
      <path
        d={OUTLINE}
        fill="none"
        stroke="rgba(0,0,0,0.32)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M68 18 C78 44 122 44 132 18"
        fill="none"
        stroke={colors.accent}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M54 78 L54 224 M146 78 L146 224"
        stroke="rgba(0,0,0,0.10)"
        strokeWidth="1"
        fill="none"
      />

      {number ? (
        <text
          x="100"
          y="172"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="62"
          fontWeight="800"
          letterSpacing="-3"
          fill={colors.accent}
          opacity="0.95"
        >
          {number}
        </text>
      ) : null}
    </svg>
  );
}

function PatternFill({
  pattern,
  colors,
}: {
  pattern: Pattern;
  colors: Props["colors"];
}) {
  switch (pattern) {
    case "stripes":
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={14 + i * 36}
              y="0"
              width="18"
              height="240"
              fill={colors.secondary}
            />
          ))}
        </>
      );
    case "hoops":
      return (
        <>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x="0"
              y={96 + i * 34}
              width="200"
              height="17"
              fill={colors.secondary}
            />
          ))}
        </>
      );
    case "halves":
      return (
        <rect x="100" y="0" width="100" height="240" fill={colors.secondary} />
      );
    case "sash":
      return (
        <rect
          x="76"
          y="0"
          width="48"
          height="240"
          fill={colors.secondary}
          stroke={colors.accent}
          strokeWidth="3"
        />
      );
    case "solid":
    default:
      return (
        <rect
          x="0"
          y="150"
          width="200"
          height="90"
          fill={colors.secondary}
          opacity="0.35"
        />
      );
  }
}
