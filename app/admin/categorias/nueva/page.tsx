import { getAllCategories } from "@/lib/data";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva categoría" };

export default async function NewCategoryPage() {
  const categories = await getAllCategories({ includeHidden: true });

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/admin/categorias" label="Categorías" />
        <span>/</span>
        <span>Nueva</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nueva categoría
      </h1>
      <CategoryForm categories={categories} />
    </>
  );
}
