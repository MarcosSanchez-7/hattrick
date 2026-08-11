import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminSessionToken } from "@/lib/admin-auth";

const COOKIE_NAME = "hattrick_admin_session";

const PUBLIC_ADMIN_PATHS = ["/gestion-ssjblue/login", "/gestion-ssjblue/setup"];
const PUBLIC_API_PATHS = [
  "/api/admin/login",
  "/api/admin/setup",
  "/api/admin/logout",
];

/**
 * proxy.ts (antes middleware.ts — renombrado en Next.js 16). Única
 * responsabilidad: chequeo OPTIMISTA de la sesión del panel de admin (solo
 * firma/expiración del JWT, sin tocar la base) para /gestion-ssjblue/** y
 * /api/admin/**. El chequeo autoritativo (¿el admin sigue existiendo?) vive
 * en app/gestion-ssjblue/(protected)/layout.tsx, vía getCurrentAdmin().
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.includes(pathname) || PUBLIC_API_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/admin");
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
