import { NextRequest, NextResponse } from "next/server";
import { createImportPurchase, DataError, getImportPurchases } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

export async function GET(request: NextRequest) {
  const check = await requireAdminPermission("finance.access");
  if ("error" in check) return check.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const purchases = await getImportPurchases({ from, to });
  return NextResponse.json(purchases);
}

export async function POST(request: NextRequest) {
  const check = await requireAdminPermission("finance.access");
  if ("error" in check) return check.error;

  try {
    const body = await request.json();
    const purchase = await createImportPurchase({ ...body, adminName: check.admin.name });
    return NextResponse.json(purchase, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo registrar la importación." },
      { status: 500 },
    );
  }
}
