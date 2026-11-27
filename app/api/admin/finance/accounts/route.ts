import { NextRequest, NextResponse } from "next/server";
import { createFinanceAccount, DataError, getFinanceAccounts } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

export async function GET() {
  const check = await requireAdminPermission("finance.access");
  if ("error" in check) return check.error;
  const accounts = await getFinanceAccounts();
  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  const check = await requireAdminPermission("finance.access");
  if ("error" in check) return check.error;

  try {
    const body = await request.json();
    const account = await createFinanceAccount(body);
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 500 });
  }
}
