import { getAllCategories, getAllPatches, getAllSuppliers, getAllTags } from "@/lib/data";
import { ProductForm } from "@/components/admin/ProductForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const [categories, tags, patches, suppliers] = await Promise.all([
    getAllCategories({ includeHidden: true }),
    getAllTags(),
    getAllPatches(),
    getAllSuppliers(),
  ]);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/inventario" label="Inventario" />
        <span>/</span>
        <span>Nuevo</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nuevo producto
      </h1>
      <ProductForm categories={categories} tags={tags} patches={patches} suppliers={suppliers} />
    </>
  );
}
