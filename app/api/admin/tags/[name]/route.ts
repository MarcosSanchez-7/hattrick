import { NextRequest, NextResponse } from "next/server";
import type { Tag } from "@/lib/catalog";
import { DataError, deleteTag, updateTag } from "@/lib/data";
import { revalidateAfterWrite, safeRevalidatePaths } from "@/lib/revalidate";
import { requireAdminPermission } from "@/lib/admin-authorize";

type Params = { params: Promise<{ name: string }> };

// Global, conservado a propósito -- ver la justificación completa en
// app/api/admin/tags/route.ts (mismo motivo para crear/editar/borrar: tags
// se leen en prácticamente todas las páginas que muestran productos).
export async function PUT(request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("tags.write");
  if ("error" in check) return check.error;

  const { name } = await params;
  let tag: Tag;
  try {
    const body = await request.json();
    tag = await updateTag(name, { color: body?.color, isFilter: body?.isFilter });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar la etiqueta." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`actualizar etiqueta ${name}`, async () =>
    safeRevalidatePaths([{ path: "/", type: "layout" }]),
  );

  return NextResponse.json(tag);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("tags.write");
  if ("error" in check) return check.error;

  const { name } = await params;
  try {
    await deleteTag(name);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar la etiqueta." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`eliminar etiqueta ${name}`, async () =>
    safeRevalidatePaths([{ path: "/", type: "layout" }]),
  );

  return NextResponse.json({ ok: true });
}
