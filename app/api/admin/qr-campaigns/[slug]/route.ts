import { NextRequest, NextResponse } from "next/server";
import { DataError, deleteQrCampaign } from "@/lib/data";

type Params = { params: Promise<{ slug: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
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
