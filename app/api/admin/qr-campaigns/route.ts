import { NextRequest, NextResponse } from "next/server";
import { createQrCampaign, DataError, getAllQrCampaigns } from "@/lib/data";

export async function GET() {
  const campaigns = await getAllQrCampaigns();
  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
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
