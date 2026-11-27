import { NextRequest, NextResponse } from "next/server";
import { DataError, deleteQrCampaign } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

type Params = { params: Promise<{ slug: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("qr.write");
  if ("error" in check) return check.error;

  const { slug } = await params;

  try {
    await deleteQrCampaign(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar el código QR." },
      { status: 500 },
    );
  }
}
