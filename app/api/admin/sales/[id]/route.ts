import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { DataError, deleteSale, getProductSlugsByIds, getSaleById, updateSale } from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

// Invalida solo las fichas de los productos afectados (antes y después del
// cambio) en vez de todo el sitio -- ver la misma nota en sales/route.ts.
async function revalidateAffectedProducts(...productIdSets: (string | null | undefined)[][]) {
  const ids = productIdSets.flat().filter((id): id is string => Boolean(id));
  const slugs = await getProductSlugsByIds(ids);
  for (const slug of slugs) revalidatePath(`/producto/${slug}`);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const oldSale = await getSaleById(id);
    const body = await request.json();
    await updateSale(id, body);
    await revalidateAffectedProducts(
      oldSale?.items.map((i) => i.productId) ?? [],
      (body?.items ?? []).map((i: { productId?: string | null }) => i.productId),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar la venta." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const oldSale = await getSaleById(id);
    await deleteSale(id);
    await revalidateAffectedProducts(oldSale?.items.map((i) => i.productId) ?? []);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar la venta." },
      { status: 500 },
    );
  }
}
