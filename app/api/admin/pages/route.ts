import { NextRequest, NextResponse } from "next/server";
import { createPage, DataError, getAllPages } from "@/lib/data";

export async function GET() {
  const pages = await getAllPages();
  return NextResponse.json(pages);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const page = await createPage(body);
    return NextResponse.json(page, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear la página." },
      { status: 500 },
    );
  }
}
