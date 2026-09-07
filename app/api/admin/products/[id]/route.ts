import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getProductById } from "@/lib/catalog";
import {
  DataError,
  deleteProduct,
  getAllProducts,
  getProductSlugsByIds,
  setProductVisibility,
  updateProduct,
} from "@/lib/data";

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

// Solo invalida lo que ese producto realmente puede afectar, no todo el
// sitio (ver la misma nota en sales/route.ts) -- home/novedades/ofertas por
// si aparece en algún listado, y su propia ficha.
function revalidateProductPages(slug: string) {
  revalidatePath("/");
  revalidatePath("/novedades");
  revalidatePath("/ofertas");
  revalidatePath(`/producto/${slug}`);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    const product = await updateProduct(id, body);
    revalidateProductPages(product.slug);
    return NextResponse.json(product);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar el producto." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (typeof body?.isVisible !== "boolean") {
      return NextResponse.json(
        { error: "Falta el campo isVisible." },
        { status: 400 },
      );
    }
    const [slug] = await getProductSlugsByIds([id]);
    await setProductVisibility(id, body.isVisible);
    if (slug) revalidateProductPages(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo cambiar la visibilidad del producto." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const [slug] = await getProductSlugsByIds([id]);
    await deleteProduct(id);
    if (slug) revalidateProductPages(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar el producto." },
      { status: 500 },
    );
  }
}
