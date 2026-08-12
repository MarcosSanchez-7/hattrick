import Link from "next/link";
import { getAllCategories, getAllProducts } from "@/lib/data";
import { InventoryTable } from "@/components/admin/InventoryTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventario" };

export default async function AdminInventoryPage() {
  const [products, categories] = await Promise.all([
    getAllProducts({ includeHidden: true }),
    getAllCategories({ includeHidden: true }),
  ]);

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue" label="Panel" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Inventario</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Stock actual por talla de los productos de stock propio. Los de
            stock ajeno/importado no llevan cantidad, así que no aparecen acá.
          </p>
        </div>
        <Link href="/gestion-ssjblue/inventario/movimientos" className="btn btn--ghost btn--sm">
          Ver movimientos
        </Link>
      </div>

      <InventoryTable products={products} categories={categories} />
    </>
  );
}
