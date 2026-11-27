import { NextRequest, NextResponse } from "next/server";
import { DataError, deleteAdminUser, updateAdminUser } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("users.manage");
  if ("error" in check) return check.error;
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
  const check = await requireAdminPermission("users.manage");
  if ("error" in check) return check.error;
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
