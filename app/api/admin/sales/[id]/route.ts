import { NextRequest, NextResponse } from "next/server";
import {
  DataError,
  deleteSale,
  getProductSlugsAndCategoriesByIds,
  getSaleById,
  updateSale,
  updateSaleStatus,
} from "@/lib/data";
import { revalidateAfterWrite, revalidateProductListings } from "@/lib/revalidate";

type Params = { params: Promise<{ id: string }> };

// Invalida fichas + categoría + listados globales de los productos
// afectados (antes y después del cambio) en vez de todo el sitio -- ver la
// misma nota en sales/route.ts / lib/revalidate.ts.
async function revalidateAffectedProducts(...productIdSets: (string | null | undefined)[][]) {
  const ids = productIdSets.flat().filter((id): id is string => Boolean(id));
  const products = await getProductSlugsAndCategoriesByIds(ids);
  await revalidateProductListings(
    products.map((p) => ({ slug: p.slug, categorySlugs: [p.category] })),
  );
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  let oldSale: Awaited<ReturnType<typeof getSaleById>>;
  let body;
  try {
    oldSale = await getSaleById(id);
    body = await request.json();
    await updateSale(id, body);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar la venta." },
      { status: 500 },
    );
  }

  // La venta ya se actualizó -- un fallo invalidando caché de acá en más no
  // debe reportarse como si la actualización hubiera fallado.
  await revalidateAfterWrite(`actualizar venta ${id}`, () =>
    revalidateAffectedProducts(
      oldSale?.items.map((i) => i.productId) ?? [],
      (body?.items ?? []).map((i: { productId?: string | null }) => i.productId),
    ),
  );

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    await updateSaleStatus(id, {
      paymentStatus: body?.paymentStatus,
      deliveryStatus: body?.deliveryStatus,
      depositAmount: body?.depositAmount,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar el estado de la venta." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  let oldSale: Awaited<ReturnType<typeof getSaleById>>;
  try {
    oldSale = await getSaleById(id);
    await deleteSale(id);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar la venta." },
      { status: 500 },
    );
  }

  // La venta ya se eliminó -- un fallo invalidando caché de acá en más no
  // debe reportarse como si el borrado hubiera fallado.
  await revalidateAfterWrite(`eliminar venta ${id}`, () =>
    revalidateAffectedProducts(oldSale?.items.map((i) => i.productId) ?? []),
  );

  return NextResponse.json({ ok: true });
}
