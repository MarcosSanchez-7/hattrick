import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createProduct, DataError, getAllProducts } from "@/lib/data";

export async function GET() {
  const products = await getAllProducts({ includeHidden: true });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product = await createProduct(body);
    // Un producto nuevo puede aparecer en home/novedades/ofertas y tiene su
    // propia ficha -- invalidar solo eso es mucho más rápido que todo el
    // sitio (ver la misma nota en sales/route.ts).
    revalidatePath("/");
    revalidatePath("/novedades");
    revalidatePath("/ofertas");
    revalidatePath(`/producto/${product.slug}`);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear el producto." },
      { status: 500 },
    );
  }
}
