import { NextRequest, NextResponse } from "next/server";
import { DataError, deleteMerchandisePurchase, updateMerchandisePurchase } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("finance.access");
  if ("error" in check) return check.error;
  const { id } = await params;

  try {
    const body = await request.json();
    const purchase = await updateMerchandisePurchase(id, body);
    return NextResponse.json(purchase);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo actualizar la compra." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("finance.access");
  if ("error" in check) return check.error;
  const { id } = await params;

  try {
    await deleteMerchandisePurchase(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo eliminar la compra." }, { status: 500 });
  }
}
