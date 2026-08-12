import { NextRequest, NextResponse } from "next/server";
import { DataError, deleteSale } from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await deleteSale(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar la venta." },
      { status: 500 },
    );
  }
}
