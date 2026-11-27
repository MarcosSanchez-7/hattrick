import { NextRequest, NextResponse } from "next/server";
import { DataError, deleteCustomer, updateCustomer } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("customers.write");
  if ("error" in check) return check.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const customer = await updateCustomer(id, body);
    return NextResponse.json(customer);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar el cliente." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("customers.write");
  if ("error" in check) return check.error;

  const { id } = await params;

  try {
    await deleteCustomer(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar el cliente." },
      { status: 500 },
    );
  }
}
