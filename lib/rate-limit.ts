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
// script que golpee la API en bucle.
const adminLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "60 s"),
      prefix: "rl:admin",
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
