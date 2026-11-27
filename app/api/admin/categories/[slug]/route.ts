import { NextRequest, NextResponse } from "next/server";
import { getCategory, type Category } from "@/lib/catalog";
import {
  DataError,
  deleteCategory,
  getAllCategories,
  setCategoryVisibility,
  updateCategory,
} from "@/lib/data";
import {
  categoryHasStructuralChange,
  revalidateAfterWrite,
  revalidateCategoryOwnPages,
  safeRevalidatePaths,
} from "@/lib/revalidate";
import { requireAdminPermission } from "@/lib/admin-authorize";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("categories.read");
  if ("error" in check) return check.error;

  const { slug } = await params;
  const category = getCategory(
    await getAllCategories({ includeHidden: true }),
    slug,
  );
  if (!category) {
    return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("categories.write");
  if ("error" in check) return check.error;

  const { slug } = await params;
  let oldCategory: Category | undefined;
  let category: Category;
  try {
    const body = await request.json();
    oldCategory = getCategory(await getAllCategories({ includeHidden: true }), slug);
    category = await updateCategory(slug, body);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar la categoría." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`actualizar categoría ${slug}`, async () => {
    if (categoryHasStructuralChange(oldCategory, category)) {
      safeRevalidatePaths([{ path: "/", type: "layout" }]);
    } else {
      await revalidateCategoryOwnPages(slug);
    }
  });

  return NextResponse.json(category);
}

// Global, documentado (no se pudo acotar): ocultar/mostrar una categoría
// oculta/muestra también todas sus subcategorías (isCategoryVisible camina
// los ancestros) y todos los productos de esa subárbol completa
// (getAllProducts filtra por categoría oculta, ver lib/data.ts), además de
// sacarla/agregarla a Navbar/Footer. Enumerar con precisión "todas las
// fichas de producto y de categoría de todo el subárbol" es mucho más
// riesgoso (fácil de dejar algo afuera) que el ahorro que daría frente a
// simplemente invalidar todo.
export async function PATCH(request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("categories.write");
  if ("error" in check) return check.error;

  const { slug } = await params;
  try {
    const body = await request.json();
    if (typeof body?.isVisible !== "boolean") {
      return NextResponse.json(
        { error: "Falta el campo isVisible." },
        { status: 400 },
      );
    }
    await setCategoryVisibility(slug, body.isVisible);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo cambiar la visibilidad de la categoría." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`cambiar visibilidad de categoría ${slug}`, async () =>
    safeRevalidatePaths([{ path: "/", type: "layout" }]),
  );

  return NextResponse.json({ ok: true });
}

// Global, documentado: deleteCategory() (lib/data.ts) ya bloquea el borrado
// si la categoría tiene subcategorías o productos asignados, así que para
// cuando esto se ejecuta con éxito el único efecto real es que desaparece
// de Navbar/Footer (y de la página de su padre, si tenía uno) -- pero esos
// se renderizan vía el layout compartido en todas las rutas públicas.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const check = await requireAdminPermission("categories.write");
  if ("error" in check) return check.error;

  const { slug } = await params;
  try {
    await deleteCategory(slug);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar la categoría." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`eliminar categoría ${slug}`, async () =>
    safeRevalidatePaths([{ path: "/", type: "layout" }]),
  );

  return NextResponse.json({ ok: true });
}
