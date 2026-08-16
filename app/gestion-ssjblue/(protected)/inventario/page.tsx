import Link from "next/link";
import { getAllCategories, getAllProducts } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { InventoryTable } from "@/components/admin/InventoryTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventario" };

export default async function AdminInventoryPage() {
  const [products, categories, admin] = await Promise.all([
    getAllProducts({ includeHidden: true }),
    getAllCategories({ includeHidden: true }),
    getCurrentAdmin(),
  ]);
  const readOnly = admin?.role === "vendedor";

  return (
    <>
      {readOnly ? null : <AdminBackLink href="/gestion-ssjblue" label="Panel" />}
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Inventario</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            {readOnly
              ? "Stock actual por talla de cada producto — solo lectura."
              : "Crea, edita y elimina productos, y controlá el stock por talla de los de stock propio. Los de stock ajeno/importado no llevan cantidad, así que no tienen detalle de stock."}
          </p>
        </div>
        {readOnly ? null : (
          <div className="row gap-3">
            <Link href="/gestion-ssjblue/inventario/movimientos" className="btn btn--ghost btn--sm">
              Ver movimientos
            </Link>
            <Link href="/gestion-ssjblue/productos/nuevo" className="btn btn--sm">
              Nuevo producto
            </Link>
          </div>
        )}
      </div>

      <InventoryTable products={products} categories={categories} readOnly={readOnly} />
    </>
  );
}
