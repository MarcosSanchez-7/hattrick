const pyg = new Intl.NumberFormat("es-PY", {
  style: "currency",
  currency: "PYG",
  maximumFractionDigits: 0,
});

export const formatPrice = (value: number) => pyg.format(value);

const pygNumber = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });

/** Como formatPrice pero sin el símbolo "Gs." -- para placeholders/inputs
 * angostos donde el contexto (ej. un campo bajo el label "Precio") ya deja
 * claro que es plata, y el prefijo no entra sin recortarse. */
export const formatNumber = (value: number) => pygNumber.format(value);

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeFormatter = new Intl.RelativeTimeFormat("es-PY", { numeric: "auto" });

/** "hace 3 h", "hace 2 días", etc. — usado para "última conexión" en Usuarios. */
export function formatRelativeTime(iso: string): string {
  const diffSeconds = (Date.now() - new Date(iso).getTime()) / 1000;
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (diffSeconds >= secondsInUnit) {
      return relativeFormatter.format(-Math.round(diffSeconds / secondsInUnit), unit);
    }
  }
  return relativeFormatter.format(-Math.round(diffSeconds), "second");
}
