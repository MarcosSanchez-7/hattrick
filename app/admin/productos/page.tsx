import Link from "next/link";
import { getAllCategories, getAllProducts } from "@/lib/data";
import { ProductsTable } from "@/components/admin/ProductsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Productos" };

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    getAllProducts({ includeHidden: true }),
    getAllCategories({ includeHidden: true }),
  ]);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Productos</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Crea, edita y elimina las camisetas del catálogo.
          </p>
        </div>
        <Link href="/admin/productos/nuevo" className="btn btn--sm">
          Nuevo producto
        </Link>
      </div>

      <ProductsTable products={products} categories={categories} />
    </>
  );
}
