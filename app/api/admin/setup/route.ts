import { NextRequest, NextResponse } from "next/server";
import { createAdminUser, DataError, getAdminUserCount } from "@/lib/data";
import { setAdminSessionCookie } from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  try {
    const count = await getAdminUserCount();
    if (count > 0) {
      return NextResponse.json(
        { error: "Ya existe un administrador. Iniciá sesión normalmente." },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Si se configura SETUP_TOKEN (opcional), además de que no exista ningún
    // admin todavía, hace falta conocer este token para crear el primero —
    // cierra la ventana entre desplegar con la base vacía y completar el
    // setup, que si no cualquiera que llegue primero a /setup podría usar
    // para crearse una cuenta de superadmin.
    const setupToken = process.env.SETUP_TOKEN;
    if (setupToken && body?.setupToken !== setupToken) {
      return NextResponse.json(
        { error: "Token de configuración inválido." },
        { status: 403 },
      );
    }

    const admin = await createAdminUser({
      name: body?.name,
      email: body?.email,
      password: body?.password,
      role: "superadmin",
    });

    await setAdminSessionCookie(admin.id, admin.role);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear el administrador." },
      { status: 500 },
    );
  }
}
