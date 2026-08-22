"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  /** Único por página, para no mezclar el rango guardado de Ventas con el de Finanzas, etc. */
  storageKey: string;
  /** Rango efectivo ya calculado por la página (viene de la URL, o del valor por defecto). */
  defaultFrom: string;
  defaultTo: string;
  resetHref: string;
  resetLabel: string;
};

/**
 * Filtro de fechas que se acuerda del último rango elegido. Las páginas de
 * admin recalculan el rango a partir de la URL en cada carga — si el admin
 * navega a otra sección y vuelve sin from/to en la URL, antes se perdía el
 * filtro y volvía al rango por defecto (hoy / últimos N días). Guardamos el
 * último rango en localStorage y, si se entra sin filtro en la URL,
 * restauramos ese rango con un redirect del lado del cliente.
 */
export function DateRangeFilter({
  storageKey,
  defaultFrom,
  defaultTo,
  resetHref,
  resetLabel,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const storageId = `hattrick.admin.dateRange.${storageKey}`;
  const paramsKey = searchParams.toString();

  useEffect(() => {
    setFrom(defaultFrom);
    setTo(defaultTo);
  }, [defaultFrom, defaultTo]);

  useEffect(() => {
    const hasParams = searchParams.has("from") || searchParams.has("to");
    if (hasParams) {
      window.localStorage.setItem(
        storageId,
        JSON.stringify({ from: defaultFrom, to: defaultTo }),
      );
      return;
    }
    const raw = window.localStorage.getItem(storageId);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { from?: string; to?: string };
      if (saved.from) {
        // "Hasta" nunca se restaura del guardado — siempre se recalcula a
        // hoy, así el admin nunca vuelve a un rango vencido sin darse cuenta.
        const today = new Date().toISOString().slice(0, 10);
        router.replace(`${pathname}?from=${saved.from}&to=${today}`);
      }
    } catch {
      window.localStorage.removeItem(storageId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  return (
    <form
      method="get"
      className="toolbar"
      style={{ marginBottom: 24, alignItems: "flex-end" }}
    >
      <div className="row gap-3">
        <div className="admin-field">
          <label htmlFor="from">Desde</label>
          <input
            id="from"
            type="date"
            name="from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="to">Hasta</label>
          <input
            id="to"
            type="date"
            name="to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn--ghost btn--sm">
          Filtrar
        </button>
        <Link
          href={resetHref}
          className="meta link-underline"
          onClick={() => window.localStorage.removeItem(storageId)}
        >
          {resetLabel}
        </Link>
      </div>
    </form>
  );
}
