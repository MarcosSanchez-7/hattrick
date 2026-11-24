import { NextRequest, NextResponse } from "next/server";
import type { Product } from "@/lib/catalog";
import { createProduct, DataError, getAllProducts } from "@/lib/data";
import { revalidateAfterWrite, revalidateProduct } from "@/lib/revalidate";

export async function GET() {
  const products = await getAllProducts({ includeHidden: true });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  let product: Product;
  try {
    const body = await request.json();
    product = await createProduct(body);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear el producto." },
      { status: 500 },
    );
  }

  // El producto ya se creó -- un fallo invalidando caché de acá en más no
  // debe reportarse como si la creación hubiera fallado (eso llevaría a
  // reintentar y crear un duplicado).
  await revalidateAfterWrite(`crear producto ${product.id}`, () =>
    revalidateProduct(product.slug, [product.category]),
  );

  return NextResponse.json(product, { status: 201 });
}
