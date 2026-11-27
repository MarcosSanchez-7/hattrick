import { NextRequest, NextResponse } from "next/server";
import {
  DataError,
  getInventoryMovements,
  getProductSlugAndCategoryByVariantId,
  registerStockAdjustment,
} from "@/lib/data";
import { revalidateAfterWrite, revalidateProduct } from "@/lib/revalidate";
import { requireAdminPermission } from "@/lib/admin-authorize";

export async function GET(request: NextRequest) {
  const check = await requireAdminPermission("inventory.movements.read");
  if ("error" in check) return check.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const movements = await getInventoryMovements({ from, to });
  return NextResponse.json(movements);
}

export async function POST(request: NextRequest) {
  const check = await requireAdminPermission("inventory.write");
  if ("error" in check) return check.error;
  const admin = check.admin;

  let body;
  try {
    body = await request.json();
    await registerStockAdjustment({ ...body, adminName: admin.name });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo registrar el movimiento de stock." },
      { status: 500 },
    );
  }

  // El movimiento ya se registró (stock ya ajustado) -- un fallo
  // invalidando caché de acá en más no debe reportarse como si el ajuste
  // hubiera fallado (eso llevaría a reintentar y duplicar el movimiento).
  await revalidateAfterWrite(`ajuste de inventario (variante ${body?.variantId})`, async () => {
    // Solo afecta el stock de una variante -- invalidar su ficha +
    // categoría + listados globales (puede cambiar su badge "Agotado" en
    // cualquiera), no todo el sitio (ver la misma nota en sales/route.ts).
    const product = body?.variantId
      ? await getProductSlugAndCategoryByVariantId(body.variantId)
      : null;
    if (product) await revalidateProduct(product.slug, [product.category]);
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
