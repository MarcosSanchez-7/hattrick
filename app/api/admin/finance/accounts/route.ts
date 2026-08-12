import { NextRequest, NextResponse } from "next/server";
import { createFinanceAccount, DataError, getFinanceAccounts } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";

async function requireSuperadmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  if (admin.role !== "superadmin") {
    return {
      error: NextResponse.json(
        { error: "Solo un superadmin puede acceder a Finanzas." },
        { status: 403 },
      ),
    };
  }
  return { admin };
}

export async function GET() {
  const check = await requireSuperadmin();
  if (check.error) return check.error;
  const accounts = await getFinanceAccounts();
  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  const check = await requireSuperadmin();
  if (check.error) return check.error;

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
