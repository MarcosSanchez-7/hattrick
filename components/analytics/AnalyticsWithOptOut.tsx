"use client";

import { useEffect } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Modo interno: visitar el sitio con ?no-track=1 (una vez, por
 * navegador/dispositivo) guarda una cookie de 1 año que evita que ese
 * tráfico se cuente en Vercel Analytics — así las visitas del equipo
 * probando el sitio no ensucian las métricas ni consumen la cuota medida
 * de Web Analytics Events. ?no-track=0 la saca (por si hace falta volver
 * a trackear ese dispositivo, ej. un equipo compartido).
 *
 * beforeSend() corre en el navegador y no tiene acceso a la IP del
 * visitante — por eso el filtro es por cookie, no por IP.
 */

const COOKIE_NAME = "hattrick_no_track";
const QUERY_PARAM = "no-track";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function hasOptOutCookie(): boolean {
  return document.cookie
    .split("; ")
    .some((c) => c === `${COOKIE_NAME}=1`);
}

export function AnalyticsWithOptOut() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(QUERY_PARAM);
    if (value === null) return;

    if (value === "0") {
      document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
    } else {
      document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
    }

    // Saca el query param de la URL para no dejarlo pegado al navegar/compartir el link.
    params.delete(QUERY_PARAM);
    const rest = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (rest ? `?${rest}` : ""),
    );
  }, []);

  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        if (hasOptOutCookie()) return null;
        return event;
      }}
    />
  );
}
