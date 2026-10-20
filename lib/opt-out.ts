/** Cookie compartida por AnalyticsWithOptOut y MetaPixel -- visitar el
 * sitio con ?no-track=1 excluye ese navegador de ambos a la vez, para que
 * el tráfico interno de prueba no ensucie ni las métricas de Vercel ni la
 * atribución de anuncios de Meta. */
export const NO_TRACK_COOKIE_NAME = "hattrick_no_track";

export function hasOptOutCookie(): boolean {
  return document.cookie
    .split("; ")
    .some((c) => c === `${NO_TRACK_COOKIE_NAME}=1`);
}
