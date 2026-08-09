import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * proxy.ts (antes middleware.ts — renombrado en Next.js 16). Única
 * responsabilidad: refrescar la sesión de Supabase Auth de CLIENTES
 * (cookies) en cada request. Nunca redirige ni autoriza — la protección de
 * páginas concretas (p. ej. /cuenta) se hace en la propia página. Mantener
 * esto así de simple evita que en el futuro alguien amplíe el matcher hacia
 * /admin "ya que está" — /admin sigue sin ningún tipo de autenticación, tal
 * como se diseñó, y este proxy ni siquiera se ejecuta ahí.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|admin|api/admin|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
