import { notFound } from "next/navigation";
import { getProductById } from "@/lib/catalog";
import {
  getAllCategories,
  getAllPatches,
  getAllProducts,
  getAllSuppliers,
  getAllTags,
} from "@/lib/data";
import { ProductForm } from "@/components/admin/ProductForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar producto" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const [products, categories, tags, patches, suppliers] = await Promise.all([
    getAllProducts({ includeHidden: true }),
    getAllCategories({ includeHidden: true }),
    getAllTags(),
    getAllPatches(),
    getAllSuppliers(),
  ]);
  const product = getProductById(products, id);
  if (!product) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/inventario" label="Inventario" />
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar producto
      </h1>
      <ProductForm
        categories={categories}
        tags={tags}
        patches={patches}
        suppliers={suppliers}
        product={product}
      />
    </>
  );
}
