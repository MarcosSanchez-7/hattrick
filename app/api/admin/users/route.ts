import { NextRequest, NextResponse } from "next/server";
import { createAdminUser, DataError, getAllAdminUsers } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

export async function GET() {
  const check = await requireAdminPermission("users.manage");
  if ("error" in check) return check.error;
  const users = await getAllAdminUsers();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const check = await requireAdminPermission("users.manage");
  if ("error" in check) return check.error;

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
