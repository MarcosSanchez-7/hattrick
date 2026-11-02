"use client";

import { useEffect } from "react";
import { NO_TRACK_COOKIE_NAME } from "@/lib/opt-out";

/**
 * Visitar el sitio con ?no-track=1 (una vez, por navegador/dispositivo)
 * guarda una cookie de 1 año que el tracking del sitio (Meta Pixel, ver
 * MetaPixel.tsx/lib/opt-out.ts) respeta para no contar las visitas del
 * equipo probando el sitio. ?no-track=0 la saca (ej. un equipo compartido
 * donde hace falta volver a trackear ese dispositivo).
 *
 * Antes vivía adentro de AnalyticsWithOptOut.tsx (que además montaba
 * <Analytics/>/<SpeedInsights/> de Vercel) -- al sacar esas dos, separado
 * en su propio componente para que este mecanismo no dependa de tener un
 * Pixel configurado ni de ningún proveedor de analytics en particular.
 */

const QUERY_PARAM = "no-track";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function NoTrackOptOut() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(QUERY_PARAM);
    if (value === null) return;

    if (value === "0") {
      document.cookie = `${NO_TRACK_COOKIE_NAME}=; path=/; max-age=0`;
    } else {
      document.cookie = `${NO_TRACK_COOKIE_NAME}=1; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
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

  return null;
}
