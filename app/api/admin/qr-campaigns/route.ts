import { NextRequest, NextResponse } from "next/server";
import { createQrCampaign, DataError, getAllQrCampaigns } from "@/lib/data";
import { requireAdminPermission } from "@/lib/admin-authorize";

export async function GET() {
  const check = await requireAdminPermission("qr.read");
  if ("error" in check) return check.error;

  const campaigns = await getAllQrCampaigns();
  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const check = await requireAdminPermission("qr.write");
  if ("error" in check) return check.error;

  try {
    const body = await request.json();
    const campaign = await createQrCampaign(body);
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo crear el código QR." }, { status: 500 });
  }
}
