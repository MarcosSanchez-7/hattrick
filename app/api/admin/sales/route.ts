import { NextRequest, NextResponse } from "next/server";
import { DataError, getProductSlugsAndCategoriesByIds, getSales, recordSale } from "@/lib/data";
import { revalidateAfterWrite, revalidateProductListings } from "@/lib/revalidate";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const sales = await getSales({ from, to });
  return NextResponse.json(sales);
}

export async function POST(request: NextRequest) {
  let body;
  let id: string;
  try {
    body = await request.json();
    id = await recordSale(body);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo registrar la venta." },
      { status: 500 },
    );
  }

  // La venta ya se registró (stock ya descontado) -- de acá en más,
  // cualquier fallo (leer categorías, invalidar rutas) se loguea sin
  // cambiar la respuesta de éxito. Devolver un 500 acá llevaría a
  // reintentar "Registrar venta" y duplicar la venta + el descuento de
  // stock, que ya pasó.
  await revalidateAfterWrite(`registrar venta ${id}`, async () => {
    // Una venta cambia el stock (y a veces el "Agotado") de los productos
    // vendidos -- invalidar únicamente sus fichas + categoría + listados
    // globales es mucho más rápido que todo el sitio ("/", "layout" tocaba
    // las 80+ páginas pre-renderizadas y volvía lento cada "Registrar
    // venta", ver lib/revalidate.ts).
    const products = await getProductSlugsAndCategoriesByIds(
      (body?.items ?? [])
        .map((i: { productId?: string | null }) => i.productId)
        .filter((productId: string | null | undefined): productId is string => Boolean(productId)),
    );
    await revalidateProductListings(
      products.map((p) => ({ slug: p.slug, categorySlugs: [p.category] })),
    );
  });

  return NextResponse.json({ id }, { status: 201 });
}
