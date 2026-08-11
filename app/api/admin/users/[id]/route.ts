import { NextRequest, NextResponse } from "next/server";
import { DataError, deleteAdminUser, updateAdminUser } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";

type Params = { params: Promise<{ id: string }> };

async function requireSuperadmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  if (admin.role !== "superadmin") {
    return {
      error: NextResponse.json(
        { error: "Solo un superadmin puede gestionar usuarios." },
        { status: 403 },
      ),
    };
  }
  return { admin };
}

export async function PUT(request: NextRequest, { params }: Params) {
  const check = await requireSuperadmin();
  if (check.error) return check.error;
  const { id } = await params;

  try {
    const body = await request.json();
    const user = await updateAdminUser(id, body);
    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar el usuario." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const check = await requireSuperadmin();
  if (check.error) return check.error;
  const { id } = await params;

  if (id === check.admin.id) {
    return NextResponse.json(
      { error: "No podés eliminar tu propio usuario." },
      { status: 400 },
    );
  }

  try {
    await deleteAdminUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar el usuario." },
      { status: 500 },
    );
  }
}
