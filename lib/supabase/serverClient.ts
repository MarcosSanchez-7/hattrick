import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente de Supabase ligado a la sesión del navegador (vía cookies), para
 * Server Components, Route Handlers y Server Actions del lado cliente
 * (registro/login/logout/"/cuenta"). Usa la anon key: queda sujeto a RLS
 * real, a propósito nunca la service_role de lib/supabase/server.ts (esa
 * es exclusiva del panel /admin y de lib/data.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Se llama desde un Server Component sin permiso de escritura;
          // el middleware ya se encarga de refrescar la cookie en ese caso.
        }
      },
    },
  });
}
