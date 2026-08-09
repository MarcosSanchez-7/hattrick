import { NextRequest, NextResponse } from "next/server";
import { getCategory } from "@/lib/catalog";
import {
  DataError,
  deleteCategory,
  getAllCategories,
  setCategoryVisibility,
  updateCategory,
} from "@/lib/data";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const category = getCategory(
    await getAllCategories({ includeHidden: true }),
    slug,
  );
  if (!category) {
    return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const body = await request.json();
    const category = await updateCategory(slug, body);
    return NextResponse.json(category);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar la categoría." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const body = await request.json();
    if (typeof body?.isVisible !== "boolean") {
      return NextResponse.json(
        { error: "Falta el campo isVisible." },
        { status: 400 },
      );
    }
    await setCategoryVisibility(slug, body.isVisible);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo cambiar la visibilidad de la categoría." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    await deleteCategory(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar la categoría." },
      { status: 500 },
    );
  }
}
