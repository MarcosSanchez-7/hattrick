import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials } from "@/lib/data";
import { setAdminSessionCookie } from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email.trim() || !password) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos." },
        { status: 401 },
      );
    }

    const admin = await verifyAdminCredentials(email, password);
    if (!admin) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos." },
        { status: 401 },
      );
    }

    await setAdminSessionCookie(admin.id, admin.role);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 },
    );
  }
}
