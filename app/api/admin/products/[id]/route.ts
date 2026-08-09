import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/catalog";
import {
  DataError,
  deleteProduct,
  getAllProducts,
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

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    const product = await updateProduct(id, body);
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
    await setProductVisibility(id, body.isVisible);
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
    await deleteProduct(id);
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
