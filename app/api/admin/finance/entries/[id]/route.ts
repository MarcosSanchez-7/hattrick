import { NextRequest, NextResponse } from "next/server";
import { DataError, deleteFinanceEntry, updateFinanceEntry } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("finance.access");
  if ("error" in check) return check.error;
  const { id } = await params;

  try {
    const body = await request.json();
    const entry = await updateFinanceEntry(id, body);
    return NextResponse.json(entry);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar el movimiento." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("finance.access");
  if ("error" in check) return check.error;
  const { id } = await params;

  try {
    await deleteFinanceEntry(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar el movimiento." },
      { status: 500 },
    );
  }
}
