import { NextRequest, NextResponse } from "next/server";
import { createImportCourier, DataError, getImportCouriers } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

export async function GET() {
  const check = await requireAdminPermission("finance.access");
  if ("error" in check) return check.error;
  const couriers = await getImportCouriers();
  return NextResponse.json(couriers);
}

export async function POST(request: NextRequest) {
  const check = await requireAdminPermission("finance.access");
  if ("error" in check) return check.error;

  try {
    const body = await request.json();
    const courier = await createImportCourier(body);
    return NextResponse.json(courier, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo crear el courier." }, { status: 500 });
  }
}
