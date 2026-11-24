import { NextRequest, NextResponse } from "next/server";
import type { Tag } from "@/lib/catalog";
import { createTag, DataError, getAllTags } from "@/lib/data";
import { revalidateAfterWrite, safeRevalidatePaths } from "@/lib/revalidate";

export async function GET() {
  const tags = await getAllTags();
  return NextResponse.json(tags);
}

// Global, conservado a propósito (analizado, no es un descuido): getAllTags()
// se pide en TODAS las páginas que listan o muestran productos -- home,
// cada categoría, novedades, ofertas, búsqueda, favoritos Y cada ficha de
// producto (el color del badge y los chips de filtro de ProductBrowser
// dependen de tag.color/tag.isFilter) -- ver grep de getAllTags en
// app/(store)/**. Acotar esto requeriría enumerar ~8 rutas (incluyendo 2
// patrones comodín para categoría/producto) para ahorrarse invalidar un
// puñado de páginas informativas y /mayorista/personalizacion que ni
// siquiera muestran tags -- una ganancia marginal frente al riesgo real de
// olvidar un consumidor. No se tocó el alcance de la invalidación en esta
// fase, solo se aisló el error de la escritura (ver revalidateAfterWrite).
export async function POST(request: NextRequest) {
  let tag: Tag;
  try {
    const body = await request.json();
    tag = await createTag(body?.name, body?.color ?? "#2f2f2f", body?.isFilter ?? false);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear la etiqueta." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`crear etiqueta ${tag.name}`, async () =>
    safeRevalidatePaths([{ path: "/", type: "layout" }]),
  );

  return NextResponse.json(tag, { status: 201 });
}
