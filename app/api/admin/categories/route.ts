import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createCategory, DataError, getAllCategories } from "@/lib/data";

export async function GET() {
  const categories = await getAllCategories({ includeHidden: true });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const category = await createCategory(body);
    revalidatePath("/", "layout");
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo crear la categoría." },
      { status: 500 },
    );
  }
}
