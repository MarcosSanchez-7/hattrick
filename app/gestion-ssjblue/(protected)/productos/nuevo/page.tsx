import { getAllCategories, getAllTags } from "@/lib/data";
import { ProductForm } from "@/components/admin/ProductForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const [categories, tags] = await Promise.all([
    getAllCategories({ includeHidden: true }),
    getAllTags(),
  ]);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/productos" label="Productos" />
        <span>/</span>
        <span>Nuevo</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nuevo producto
      </h1>
      <ProductForm categories={categories} tags={tags} />
    </>
  );
}
