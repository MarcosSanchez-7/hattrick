const pyg = new Intl.NumberFormat("es-PY", {
  style: "currency",
  currency: "PYG",
  maximumFractionDigits: 0,
});

export const formatPrice = (value: number) => pyg.format(value);

const plainNumber = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });

/** Mismo separador de miles que formatPrice (es-PY: "."), sin el símbolo de
 * moneda -- para inputs editables donde el usuario tipea el número pero no
 * tiene sentido mostrarle "Gs." adentro del campo (ver SaleForm.tsx). */
export const formatNumber = (value: number) => plainNumber.format(value);

/** Inverso de formatNumber -- saca todo lo que no sea dígito (separadores
 * de miles incluidos) para volver a tener el número crudo que se guarda en
 * el estado/se manda al servidor. */
export const parseFormattedNumber = (value: string): string =>
  value.replace(/[^\d]/g, "");

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
