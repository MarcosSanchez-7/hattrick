import { NextRequest, NextResponse } from "next/server";
import { createSupplier, DataError, getAllSuppliers } from "@/lib/data";

export async function GET() {
  const suppliers = await getAllSuppliers();
  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
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
