import { NextResponse, type NextRequest } from "next/server";
import { ipAddress } from "@vercel/functions";
import { verifyAdminSessionToken } from "@/lib/admin-auth";
import { checkAdminRateLimit, checkStrictRateLimit } from "@/lib/rate-limit";

const COOKIE_NAME = "hattrick_admin_session";

const PUBLIC_ADMIN_PATHS = ["/gestion-ssjblue/login", "/gestion-ssjblue/setup"];
const PUBLIC_API_PATHS = [
  "/api/admin/login",
  "/api/admin/setup",
  "/api/admin/logout",
];

// Login y setup permiten pocos intentos por minuto (fuerza bruta); el resto
// del panel usa un límite más generoso, solo para frenar abuso en bucle.
const STRICT_RATE_LIMIT_PATHS = [
  "/gestion-ssjblue/login",
  "/gestion-ssjblue/setup",
  "/api/admin/login",
  "/api/admin/setup",
];

const isDev = process.env.NODE_ENV === "development";

/**
 * CSP del panel de admin, por nonce en vez de 'unsafe-inline' en
 * script-src (ver next.config.ts para la CSP del storefront público, que
 * se queda con 'unsafe-inline' a propósito). Viable acá sin costo real
 * porque TODO /gestion-ssjblue/** y /api/admin/** ya es contenido dinámico
 * (sesión de por medio, nunca tuvo ISR que perder) -- hacerlo sitewide sí
 * tiene costo real: Next.js exige rendering dinámico en cualquier página
 * que use el nonce, lo que apagaría el ISR del storefront (home, fichas de
 * producto, categorías), documentado como la razón de no hacerlo ahí.
 */
function buildAdminCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://nominatim.openstreetmap.org https://*.public.blob.vercel-storage.com https://vercel.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * proxy.ts (antes middleware.ts — renombrado en Next.js 16). Responsable de
 * tres cosas para /gestion-ssjblue/** y /api/admin/**: (1) rate limiting por
 * IP (ver lib/rate-limit.ts), (2) chequeo OPTIMISTA de la sesión del panel
 * de admin (solo firma/expiración del JWT, sin tocar la base — el chequeo
 * autoritativo vive en app/gestion-ssjblue/(protected)/layout.tsx, vía
 * getCurrentAdmin()) y (3) la CSP por nonce del admin (ver buildAdminCsp).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/admin");

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildAdminCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const next = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  const ip = ipAddress(request);
  if (ip) {
    const isStrict = STRICT_RATE_LIMIT_PATHS.includes(pathname);
    const { limited, retryAfterSeconds } = isStrict
      ? await checkStrictRateLimit(ip)
      : await checkAdminRateLimit(ip);

    if (limited) {
      if (isApi) {
        return NextResponse.json(
          { error: "Demasiados intentos, esperá un momento." },
          {
            status: 429,
            headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {},
          },
        );
      }
      return new NextResponse(
        "Demasiados intentos. Esperá un momento y volvé a intentar.",
        { status: 429, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }
  }

  if (PUBLIC_ADMIN_PATHS.includes(pathname) || PUBLIC_API_PATHS.includes(pathname)) {
    return next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyAdminSessionToken(token) : null;

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/gestion-ssjblue/login", request.url));
  }

  // Vendedor: acceso de solo lectura, únicamente a Inventario. Se resuelve
  // acá (no página por página) para que ninguna sección nueva se olvide de
  // excluirla, y para cerrar de un saque cualquier endpoint de escritura.
  if (session.role === "vendedor") {
    if (isApi) {
      if (request.method !== "GET" && pathname !== "/api/admin/heartbeat") {
        return NextResponse.json(
          { error: "Tu usuario es de solo lectura." },
          { status: 403 },
        );
      }
    } else if (pathname !== "/gestion-ssjblue/inventario") {
      return NextResponse.redirect(new URL("/gestion-ssjblue/inventario", request.url));
    }
  }

  return next();
}

export const config = {
  matcher: ["/gestion-ssjblue/:path*", "/api/admin/:path*"],
};
