import { NextRequest, NextResponse } from "next/server";
import type { Product } from "@/lib/catalog";
import { createProduct, DataError, getAllProducts } from "@/lib/data";
import { revalidateAfterWrite, revalidateProduct } from "@/lib/revalidate";
import { requireAdminPermission } from "@/lib/admin-authorize";
import { redactProductsForRole } from "@/lib/admin-redact";

export async function GET() {
  const check = await requireAdminPermission("products.read");
  if ("error" in check) return check.error;

  const products = await getAllProducts({ includeHidden: true });
  return NextResponse.json(redactProductsForRole(products, check.admin.role));
}

export async function POST(request: NextRequest) {
  const check = await requireAdminPermission("products.write");
  if ("error" in check) return check.error;

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
