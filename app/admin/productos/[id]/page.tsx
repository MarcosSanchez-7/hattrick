import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/catalog";
import { getAllCategories, getAllProducts } from "@/lib/data";
import { ProductForm } from "@/components/admin/ProductForm";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar producto" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);
  const product = getProductById(products, id);
  if (!product) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <Link href="/admin/productos">Productos</Link>
        <span>/</span>
        <span>
          {product.team} — {product.name}
        </span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar producto
      </h1>
      <ProductForm categories={categories} product={product} />
    </>
  );
}
