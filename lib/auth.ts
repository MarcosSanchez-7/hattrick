import "server-only";
import { createClient } from "@/lib/supabase/serverClient";

export type Customer = {
  id: string;
  email: string;
  fullName: string | null;
};

/**
 * Cliente autenticado actual, o null si no hay sesión. Usa getUser() (no
 * getSession()): revalida el JWT contra el servidor de Auth en vez de
 * confiar en la cookie sin verificar. Lee su perfil con el mismo cliente de
 * sesión (no supabaseAdmin), para que quede sujeto a la RLS real de
 * "customers" — es la prueba de que la política de la tabla funciona.
 */
export async function getCurrentCustomer(): Promise<Customer | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("customers")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email ?? "",
      fullName: profile?.full_name ?? null,
    };
  } catch (err) {
    // Nunca debe tumbar la tienda: si Supabase Auth falla o la tabla
    // "customers" todavía no existe, se trata como "sin sesión" en vez de
    // romper la página (mismo criterio que lib/data.ts:getSetting).
    console.error("No se pudo obtener la sesión del cliente:", err);
    return null;
  }
}
