import { NextRequest, NextResponse } from "next/server";
import { getProductById, type Product } from "@/lib/catalog";
import {
  DataError,
  deleteProduct,
  getAllProducts,
  getProductSlugsAndCategoriesByIds,
  setProductVisibility,
  updateProduct,
} from "@/lib/data";
import {
  revalidateAfterWrite,
  revalidateProduct,
  revalidateProductListings,
} from "@/lib/revalidate";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const product = getProductById(
    await getAllProducts({ includeHidden: true }),
    id,
  );
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  let oldSlug: string | null = null;
  let oldCategory: string | null = null;
  let product: Product;
  try {
    const body = await request.json();
    // Slug + categoría ANTES de aplicar el cambio -- si el producto se
    // mueve de categoría y/o le cambian la URL (campo "slug" editable en
    // ProductForm), tanto la página vieja como la nueva necesitan
    // invalidarse, no solo la nueva.
    const [old] = await getProductSlugsAndCategoriesByIds([id]);
    oldSlug = old?.slug ?? null;
    oldCategory = old?.category ?? null;
    product = await updateProduct(id, body);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar el producto." },
      { status: 500 },
    );
  }

  // El producto ya se actualizó -- de acá en más, cualquier fallo se loguea
  // sin cambiar la respuesta de éxito ya decidida arriba.
  await revalidateAfterWrite(`actualizar producto ${id}`, () => {
    const slugs =
      oldSlug && oldSlug !== product.slug ? [oldSlug, product.slug] : [product.slug];
    return revalidateProductListings(
      slugs.map((slug) => ({ slug, categorySlugs: [oldCategory, product.category] })),
    );
  });

  return NextResponse.json(product);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  let product: { slug: string; category: string } | undefined;
  try {
    const body = await request.json();
    if (typeof body?.isVisible !== "boolean") {
      return NextResponse.json(
        { error: "Falta el campo isVisible." },
        { status: 400 },
      );
    }
    [product] = await getProductSlugsAndCategoriesByIds([id]);
    await setProductVisibility(id, body.isVisible);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo cambiar la visibilidad del producto." },
      { status: 500 },
    );
  }

  if (product) {
    const resolved = product;
    await revalidateAfterWrite(`cambiar visibilidad del producto ${id}`, () =>
      revalidateProduct(resolved.slug, [resolved.category]),
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  let product: { slug: string; category: string } | undefined;
  try {
    [product] = await getProductSlugsAndCategoriesByIds([id]);
    await deleteProduct(id);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar el producto." },
      { status: 500 },
    );
  }

  if (product) {
    const resolved = product;
    await revalidateAfterWrite(`eliminar producto ${id}`, () =>
      revalidateProduct(resolved.slug, [resolved.category]),
    );
  }

  return NextResponse.json({ ok: true });
}
