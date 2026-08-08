import Link from "next/link";
import { getAllCategories } from "@/lib/data";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const categories = await getAllCategories();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <Link href="/admin/productos">Productos</Link>
        <span>/</span>
        <span>Nuevo</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nuevo producto
      </h1>
      <ProductForm categories={categories} />
    </>
  );
}
