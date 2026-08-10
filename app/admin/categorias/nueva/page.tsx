import { getCategory } from "@/lib/catalog";
import { getAllCategories } from "@/lib/data";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva categoría" };

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>;
}) {
  const [{ parent: parentSlug }, categories] = await Promise.all([
    searchParams,
    getAllCategories({ includeHidden: true }),
  ]);
  const parentCategory = parentSlug ? getCategory(categories, parentSlug) : undefined;

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/admin/categorias" label="Categorías" />
        <span>/</span>
        <span>Nueva</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        {parentCategory ? `Nueva subcategoría de ${parentCategory.name}` : "Nueva categoría"}
      </h1>
      <CategoryForm categories={categories} defaultParentSlug={parentCategory?.slug} />
    </>
  );
}
