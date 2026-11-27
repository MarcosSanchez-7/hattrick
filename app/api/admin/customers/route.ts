import { NextRequest, NextResponse } from "next/server";
import { createCustomer, DataError, getCustomersWithStats } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

export async function GET() {
  const check = await requireAdminPermission("customers.read");
  if ("error" in check) return check.error;

  const customers = await getCustomersWithStats();
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const check = await requireAdminPermission("customers.write");
  if ("error" in check) return check.error;

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
