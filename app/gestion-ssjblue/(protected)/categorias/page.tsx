import Link from "next/link";
import { getAllCategories, getAllProducts } from "@/lib/data";
import { CategoriesTable } from "@/components/admin/CategoriesTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categorías" };

export default async function AdminCategoriesPage() {
  const [categories, products] = await Promise.all([
    getAllCategories({ includeHidden: true }),
    getAllProducts({ includeHidden: true }),
  ]);

  const productCounts = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Categorías</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Organiza el catálogo. Usá el ícono{" "}
            <span style={{ fontWeight: 600 }}>+</span> de cada fila para
            añadirle una subcategoría. Las categorías con productos o
            subcategorías no se pueden eliminar.
          </p>
        </div>
        <Link href="/gestion-ssjblue/categorias/nueva" className="btn btn--sm">
          Nueva categoría
        </Link>
      </div>

      <CategoriesTable categories={categories} productCounts={productCounts} />
    </>
  );
}
