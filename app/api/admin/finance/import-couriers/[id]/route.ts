import { NextRequest, NextResponse } from "next/server";
import { DataError, deleteImportCourier, updateImportCourier } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";

type Params = { params: Promise<{ id: string }> };

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

export async function PUT(request: NextRequest, { params }: Params) {
  const check = await requireSuperadmin();
  if (check.error) return check.error;
  const { id } = await params;

  try {
    const body = await request.json();
    const courier = await updateImportCourier(id, body);
    return NextResponse.json(courier);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo actualizar el courier." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const check = await requireSuperadmin();
  if (check.error) return check.error;
  const { id } = await params;

  try {
    await deleteImportCourier(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo eliminar el courier." }, { status: 500 });
  }
}
