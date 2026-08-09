import { notFound } from "next/navigation";
import { getCategory } from "@/lib/catalog";
import { getAllCategories } from "@/lib/data";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { slug: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar categoría" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const category = getCategory(await getAllCategories(), slug);
  if (!category) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/admin/categorias" label="Categorías" />
        <span>/</span>
        <span>{category.name}</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar categoría
      </h1>
      <CategoryForm category={category} />
    </>
  );
}
