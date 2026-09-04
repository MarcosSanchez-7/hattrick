/**
 * Todas las fechas de "hoy"/rangos de filtro del panel deben calcularse en
 * hora de Paraguay, no en la del servidor (Vercel corre en UTC) ni en la de
 * la máquina de quien desarrolla — si no, una venta cargada a las 8-10pm
 * local ya cae del lado de "mañana" según UTC y desaparece/aparece mal en
 * los filtros por día. Se usa el identificador de zona IANA vía Intl en vez
 * de un offset fijo (ej. "UTC-4") porque Paraguay históricamente cambió
 * entre horario de verano e invierno — Intl aplica la regla vigente sola.
 */
export const PARAGUAY_TZ = "America/Asuncion";

function timeZoneOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/** Fecha de hoy (YYYY-MM-DD) según el horario de Paraguay. */
export function todayInParaguay(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PARAGUAY_TZ }).format(new Date());
}

/** Fecha (YYYY-MM-DD) de un timestamp guardado (UTC), tal como cae en el
 * calendario de Paraguay — no alcanza con cortar el string ISO crudo, un
 * timestamp de las 21-23hs local ya cambió de día en UTC. */
export function toParaguayDateString(isoString: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PARAGUAY_TZ }).format(
    new Date(isoString),
  );
}

/** Mes actual (YYYY-MM) según el horario de Paraguay. */
export function currentMonthInParaguay(): string {
  return todayInParaguay().slice(0, 7);
}

/** Fecha (YYYY-MM-DD) de hace N meses, contada desde "hoy" en Paraguay. */
export function monthsAgoInParaguay(months: number): string {
  const [y, m, d] = todayInParaguay().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - months, d)).toISOString().slice(0, 10);
}

/** Fecha (YYYY-MM-DD) de hace N días, contada desde "hoy" en Paraguay. */
export function daysAgoInParaguay(days: number): string {
  const [y, m, d] = todayInParaguay().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
}

/**
 * Convierte una fecha civil (YYYY-MM-DD) tal como se vive en Paraguay al
 * instante UTC real que le corresponde, para comparar contra columnas
 * timestamptz en Postgres sin que el día calendario quede corrido.
 */
function paraguayCivilToUtcISO(dateStr: string, edge: "start" | "end"): string {
  const wallClock = edge === "start" ? "00:00:00.000" : "23:59:59.999";
  // Primera pasada: la hora civil interpretada como si fuera UTC, solo como
  // instante de referencia para averiguar el offset vigente ese día.
  const guess = new Date(`${dateStr}T${wallClock}Z`);
  const offset = timeZoneOffsetMs(PARAGUAY_TZ, guess);
  return new Date(guess.getTime() - offset).toISOString();
}

/** Límites UTC (para .gte/.lte contra timestamptz) de un rango de días,
 * interpretando `from`/`to` como fechas civiles de Paraguay. */
export function paraguayDayRangeToUtc(
  fromDateStr: string,
  toDateStr: string,
): { from: string; to: string } {
  return {
    from: paraguayCivilToUtcISO(fromDateStr, "start"),
    to: paraguayCivilToUtcISO(toDateStr, "end"),
  };
}
