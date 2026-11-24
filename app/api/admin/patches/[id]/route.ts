import { NextRequest, NextResponse } from "next/server";
import type { Patch } from "@/lib/catalog";
import {
  DataError,
  deletePatch,
  getProductIdsByPatchId,
  getProductSlugsAndCategoriesByIds,
  updatePatch,
} from "@/lib/data";
import { revalidateAfterWrite, revalidateProductPagesOnly } from "@/lib/revalidate";

type Params = { params: Promise<{ id: string }> };

// Solo invalida las fichas de los productos que tienen este parche
// asignado (vía product_patches) -- NO "/"/novedades/ofertas/categoría:
// un parche no aparece en ningún listado ni grilla, solo en el selector de
// personalización de ProductDetail.tsx dentro de la propia ficha. Por eso
// usa revalidateProductPagesOnly (fichas nomás) y no revalidateProductListings
// (que agrega esos tres listados globales siempre, correcto para precio/
// stock/visibilidad pero de más acá).
async function revalidatePatchProducts(patchId: string): Promise<void> {
  const productIds = await getProductIdsByPatchId(patchId);
  const products = await getProductSlugsAndCategoriesByIds(productIds);
  revalidateProductPagesOnly(products.map((p) => p.slug));
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  let patch: Patch;
  try {
    const body = await request.json();
    patch = await updatePatch(id, body);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar el parche." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`actualizar parche ${id}`, () => revalidatePatchProducts(id));

  return NextResponse.json(patch);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  // Resolver ANTES de borrar: una vez eliminado el parche, product_patches
  // ya no tiene de dónde sacar qué productos lo tenían asignado.
  let affectedProductIds: string[] = [];
  try {
    affectedProductIds = await getProductIdsByPatchId(id);
    await deletePatch(id);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar el parche." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`eliminar parche ${id}`, async () => {
    const products = await getProductSlugsAndCategoriesByIds(affectedProductIds);
    revalidateProductPagesOnly(products.map((p) => p.slug));
  });

  return NextResponse.json({ ok: true });
}
