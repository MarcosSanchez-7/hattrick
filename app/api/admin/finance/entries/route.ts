import { NextRequest, NextResponse } from "next/server";
import { createFinanceEntry, DataError, getFinanceEntries } from "@/lib/data";
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

export async function GET(request: NextRequest) {
  const check = await requireSuperadmin();
  if (check.error) return check.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const entries = await getFinanceEntries({ from, to });
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const check = await requireSuperadmin();
  if (check.error) return check.error;

  try {
    const body = await request.json();
    const entry = await createFinanceEntry({ ...body, adminName: check.admin.name });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo registrar el movimiento." },
      { status: 500 },
    );
  }
}
