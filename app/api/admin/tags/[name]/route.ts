import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { DataError, deleteTag, updateTagColor } from "@/lib/data";

type Params = { params: Promise<{ name: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { name } = await params;
  try {
    const body = await request.json();
    const tag = await updateTagColor(name, body?.color);
    revalidatePath("/", "layout");
    return NextResponse.json(tag);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar la etiqueta." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { name } = await params;
  try {
    await deleteTag(name);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar la etiqueta." },
      { status: 500 },
    );
  }
}
