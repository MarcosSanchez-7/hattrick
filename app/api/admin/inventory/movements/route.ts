import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  DataError,
  getInventoryMovements,
  getProductSlugByVariantId,
  registerStockAdjustment,
} from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const movements = await getInventoryMovements({ from, to });
  return NextResponse.json(movements);
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await request.json();
    await registerStockAdjustment({ ...body, adminName: admin.name });
    // Solo afecta el stock de una variante -- invalidar únicamente esa
    // ficha, no todo el sitio (ver la misma nota en sales/route.ts).
    const slug = body?.variantId ? await getProductSlugByVariantId(body.variantId) : null;
    if (slug) revalidatePath(`/producto/${slug}`);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo registrar el movimiento de stock." },
      { status: 500 },
    );
  }
}
