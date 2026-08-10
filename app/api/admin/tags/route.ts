import { NextRequest, NextResponse } from "next/server";
import { createTag, DataError, getAllTags } from "@/lib/data";

export async function GET() {
  const tags = await getAllTags();
  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tag = await createTag(body?.name, body?.color ?? "#2f2f2f");
    return NextResponse.json(tag, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear la etiqueta." },
      { status: 500 },
    );
  }
}
