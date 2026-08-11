import { NextRequest, NextResponse } from "next/server";
import { DataError, deletePage, getAllPages, updatePage } from "@/lib/data";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const pages = await getAllPages();
  const page = pages.find((p) => p.slug === slug);
  if (!page) {
    return NextResponse.json({ error: "Página no encontrada." }, { status: 404 });
  }
  return NextResponse.json(page);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const body = await request.json();
    const page = await updatePage(slug, body);
    return NextResponse.json(page);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar la página." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    await deletePage(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar la página." },
      { status: 500 },
    );
  }
}
