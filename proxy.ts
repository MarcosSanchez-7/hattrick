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

/**
 * proxy.ts (antes middleware.ts — renombrado en Next.js 16). Responsable de
 * dos cosas para /gestion-ssjblue/** y /api/admin/**: (1) rate limiting por
 * IP (ver lib/rate-limit.ts) y (2) chequeo OPTIMISTA de la sesión del panel
 * de admin (solo firma/expiración del JWT, sin tocar la base). El chequeo
 * autoritativo (¿el admin sigue existiendo?) vive en
 * app/gestion-ssjblue/(protected)/layout.tsx, vía getCurrentAdmin().
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/admin");

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
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyAdminSessionToken(token) : null;

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/gestion-ssjblue/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/gestion-ssjblue/:path*", "/api/admin/:path*"],
};
