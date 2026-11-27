import { NextRequest, NextResponse } from "next/server";
import type { Category } from "@/lib/catalog";
import { createCategory, DataError, getAllCategories } from "@/lib/data";
import { revalidateAfterWrite, safeRevalidatePaths } from "@/lib/revalidate";
import { requireAdminPermission } from "@/lib/admin-authorize";

export async function GET() {
  const check = await requireAdminPermission("categories.read");
  if ("error" in check) return check.error;

  const categories = await getAllCategories({ includeHidden: true });
  return NextResponse.json(categories);
}

// Global, documentado (no se pudo acotar): una categoría nueva aparece en
// el menú de Navbar (si es de primer nivel) y/o como tile de subcategoría
// en la página de su padre, y en el Footer -- Navbar/Footer se renderizan
// vía el layout compartido en TODAS las rutas públicas (ver
// app/(store)/layout.tsx), así que no hay un subconjunto de páginas más
// chico que garantice que el menú se vea actualizado en todos lados.
export async function POST(request: NextRequest) {
  const check = await requireAdminPermission("categories.write");
  if ("error" in check) return check.error;

  let category: Category;
  try {
    const body = await request.json();
    category = await createCategory(body);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear la categoría." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`crear categoría ${category.slug}`, async () =>
    safeRevalidatePaths([{ path: "/", type: "layout" }]),
  );

  return NextResponse.json(category, { status: 201 });
}
