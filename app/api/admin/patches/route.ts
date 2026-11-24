import { NextRequest, NextResponse } from "next/server";
import { createPatch, DataError, getAllPatches } from "@/lib/data";

export async function GET() {
  const patches = await getAllPatches();
  return NextResponse.json(patches);
}

// Un parche recién creado no tiene ningún producto asignado todavía (eso
// pasa después, al editar un producto y tildarlo en su selector -- ver
// components/admin/ProductForm.tsx, patchIds). No aparece en ninguna
// página pública hasta entonces, así que crear uno no invalida nada.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const patch = await createPatch(body);
    return NextResponse.json(patch, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo crear el parche." }, { status: 500 });
  }
}
