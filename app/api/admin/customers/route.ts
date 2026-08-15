import { NextRequest, NextResponse } from "next/server";
import { createCustomer, DataError, getCustomersWithStats } from "@/lib/data";

export async function GET() {
  const customers = await getCustomersWithStats();
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer = await createCustomer(body);
    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo crear el cliente." }, { status: 500 });
  }
}
