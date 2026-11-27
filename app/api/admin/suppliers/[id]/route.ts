import { NextRequest, NextResponse } from "next/server";
import { DataError, deleteSupplier } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("suppliers.write");
  if ("error" in check) return check.error;

  const { id } = await params;
  try {
    await deleteSupplier(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar el proveedor." },
      { status: 500 },
    );
  }
}
