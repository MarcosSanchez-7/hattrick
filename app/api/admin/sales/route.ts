import { NextRequest, NextResponse } from "next/server";
import { DataError, getSales, recordSale } from "@/lib/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const sales = await getSales({ from, to });
  return NextResponse.json(sales);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = await recordSale(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo registrar la venta." },
      { status: 500 },
    );
  }
}
