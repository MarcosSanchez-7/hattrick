import Link from "next/link";
import { getAllCategories, getAllProducts } from "@/lib/data";
import { byCategoryTree } from "@/lib/catalog";
import { CategoriesTable } from "@/components/admin/CategoriesTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categorías" };

export default async function AdminCategoriesPage() {
  const [categories, products] = await Promise.all([
    getAllCategories({ includeHidden: true }),
    getAllProducts({ includeHidden: true }),
  ]);

  // Cuenta propia + de todas las subcategorías: una categoría padre debe
  // mostrar el total de la rama, no solo los productos asignados a ella
  // directamente (que normalmente es 0, porque todo vive en sus hijas).
  const productCounts = Object.fromEntries(
    categories.map((c) => [c.slug, byCategoryTree(products, categories, c.slug).length]),
  );

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue" label="Panel" />
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
