import { NextRequest, NextResponse } from "next/server";
import { createAdminUser, DataError, getAllAdminUsers } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";

async function requireSuperadmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  if (admin.role !== "superadmin") {
    return {
      error: NextResponse.json(
        { error: "Solo un superadmin puede gestionar usuarios." },
        { status: 403 },
      ),
    };
  }
  return { admin };
}

export async function GET() {
  const check = await requireSuperadmin();
  if (check.error) return check.error;
  const users = await getAllAdminUsers();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const check = await requireSuperadmin();
  if (check.error) return check.error;

  try {
    const body = await request.json();
    const user = await createAdminUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear el usuario." },
      { status: 500 },
    );
  }
}
