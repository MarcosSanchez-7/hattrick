import { NextRequest, NextResponse } from "next/server";
import type { Page } from "@/lib/catalog";
import { DataError, deletePage, getAllPages, updatePage } from "@/lib/data";
import { pageAffectsFooter, revalidateAfterWrite, safeRevalidatePaths } from "@/lib/revalidate";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const pages = await getAllPages();
  const page = pages.find((p) => p.slug === slug);
  if (!page) {
    return NextResponse.json({ error: "Página no encontrada." }, { status: 404 });
  }
  return NextResponse.json(page);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  let oldPage: Page | undefined;
  let page: Page;
  try {
    const body = await request.json();
    oldPage = (await getAllPages()).find((p) => p.slug === slug);
    page = await updatePage(slug, body);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar la página." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`actualizar página ${slug}`, async () => {
    if (pageAffectsFooter(oldPage, page)) {
      safeRevalidatePaths([{ path: "/", type: "layout" }]);
    } else {
      safeRevalidatePaths([`/pagina/${slug}`]);
    }
  });

  return NextResponse.json(page);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    await deletePage(slug);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo eliminar la página." },
      { status: 500 },
    );
  }

  // Global, documentado: borrar una página le saca su link al Footer,
  // compartido por todas las rutas vía el layout -- mismo motivo que crear.
  await revalidateAfterWrite(`eliminar página ${slug}`, async () =>
    safeRevalidatePaths([{ path: "/", type: "layout" }]),
  );

  return NextResponse.json({ ok: true });
}
