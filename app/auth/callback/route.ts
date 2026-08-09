import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/serverClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Destino del link de confirmación de email de Supabase Auth. Vive fuera de
 * (store) y de api/admin a propósito: un tercer namespace, claramente
 * distinto del admin, dedicado solo a este intercambio.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${SITE_URL}/cuenta`);
    }
  }

  return NextResponse.redirect(
    `${SITE_URL}/cuenta/iniciar-sesion?error=enlace_invalido`,
  );
}
