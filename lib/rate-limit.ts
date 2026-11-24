import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Sin "server-only" a propósito: proxy.ts lo importa directo, mismo motivo
 * que lib/admin-auth.ts.
 *
 * Si no están configuradas las variables de Upstash (todavía no se creó la
 * cuenta, o falta en Vercel), el rate limiting queda desactivado en vez de
 * romper el sitio — "nunca debe tumbar la tienda", mismo criterio que
 * getSetting() en lib/data.ts. Un aviso en los logs para que no pase
 * desapercibido.
 */
const hasUpstash =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

if (!hasUpstash) {
  console.warn(
    "UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN no configuradas: el rate limiting está desactivado.",
  );
}

const redis = hasUpstash ? Redis.fromEnv() : null;

// Login y setup: pocos intentos legítimos por minuto, así que se puede ser
// estricto sin molestar a un admin real.
const strictLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "rl:strict",
    })
  : null;

// Resto del panel: generoso (es un solo admin usando la UI), pero frena un
// script que golpee la API en bucle. 60/60s se sentía bajo en la práctica:
// cada navegación por el sidebar dispara varios prefetch de Next.js (cada
// link visible se precarga en segundo plano) y encima cada acción en lote
// (ej. borrar varios productos seguidos) suma un DELETE + una recarga por
// cada uno — todo eso cuenta contra el mismo límite. 300/60s sigue
// bloqueando un script automatizado real, sin frenar el uso normal de un
// solo admin navegando y haciendo varias acciones seguidas.
const adminLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(300, "60 s"),
      prefix: "rl:admin",
    })
  : null;

// Resolución pública del carrito (GET /api/catalog/cart-items, sin
// sesión): legítimo que dispare más de una vez por visita (al restaurar el
// carrito desde localStorage, y de nuevo antes de continuar a WhatsApp
// para refrescar precio/stock -- ver CartProvider.tsx) pero sigue siendo
// la única ruta pública sin sesión que termina en una consulta a Supabase
// por datos arbitrarios del cliente (slugs), así que necesita un límite
// real. 20/10s deja pasar holgado el uso normal (2-3 llamadas por sesión)
// y frena un script que intente scrapear precios pidiendo muchos slugs
// distintos en bucle.
const cartResolveLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "10 s"),
      prefix: "rl:cart-resolve",
    })
  : null;

// Búsqueda pública (GET /api/catalog/search, sin sesión): más frecuente en
// la práctica que cart-resolve -- cada término con debounce de ~300ms
// mientras el cliente escribe puede disparar varias peticiones por
// sesión (ver SearchOverlay.tsx), no solo 2-3 como el carrito. 30/10s deja
// pasar holgado una sesión de tipeo normal (la caché local + el debounce
// ya evitan la mayoría de las peticiones repetidas del lado del cliente,
// ver buildSearchUrl/SearchOverlay) y sigue frenando un script que
// scrapee el catálogo completo por búsquedas en bucle.
const searchLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "10 s"),
      prefix: "rl:search",
    })
  : null;

export type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds?: number;
};

async function check(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<RateLimitResult> {
  if (!limiter) return { limited: false };
  try {
    const { success, reset } = await limiter.limit(identifier);
    if (success) return { limited: false };
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { limited: true, retryAfterSeconds };
  } catch (err) {
    // Si Upstash falla/está caído, no bloqueamos: mejor un rato sin rate
    // limit que el sitio entero caído por una dependencia externa.
    console.error("Error consultando el rate limiter, se permite la petición:", err);
    return { limited: false };
  }
}

export function checkStrictRateLimit(ip: string): Promise<RateLimitResult> {
  return check(strictLimiter, ip);
}

export function checkAdminRateLimit(ip: string): Promise<RateLimitResult> {
  return check(adminLimiter, ip);
}

export function checkCartResolveRateLimit(ip: string): Promise<RateLimitResult> {
  return check(cartResolveLimiter, ip);
}

export function checkSearchRateLimit(ip: string): Promise<RateLimitResult> {
  return check(searchLimiter, ip);
}
