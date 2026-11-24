import { NextRequest, NextResponse } from "next/server";
import type { Page } from "@/lib/catalog";
import { createPage, DataError, getAllPages } from "@/lib/data";
import { revalidateAfterWrite, safeRevalidatePaths } from "@/lib/revalidate";

export async function GET() {
  const pages = await getAllPages();
  return NextResponse.json(pages);
}

// Global, documentado: una página nueva agrega un link al Footer
// (components/layout/Footer.tsx agrupa por `placement`), que se renderiza
// vía el layout compartido en TODAS las rutas públicas -- no hay un
// subconjunto de páginas más chico que lo cubra.
export async function POST(request: NextRequest) {
  let page: Page;
  try {
    const body = await request.json();
    page = await createPage(body);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear la página." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`crear página ${page.slug}`, async () =>
    safeRevalidatePaths([{ path: "/", type: "layout" }]),
  );

  return NextResponse.json(page, { status: 201 });
}
