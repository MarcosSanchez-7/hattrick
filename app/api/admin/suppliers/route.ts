import { NextRequest, NextResponse } from "next/server";
import { createSupplier, DataError, getAllSuppliers } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

export async function GET() {
  const check = await requireAdminPermission("suppliers.read");
  if ("error" in check) return check.error;

  const suppliers = await getAllSuppliers();
  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
  const check = await requireAdminPermission("suppliers.write");
  if ("error" in check) return check.error;

  try {
    const body = await request.json();
    const supplier = await createSupplier(body?.name, body?.notes);
    return NextResponse.json(supplier, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear el proveedor." },
      { status: 500 },
    );
  }
}
