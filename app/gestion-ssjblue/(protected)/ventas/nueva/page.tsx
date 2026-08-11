import { getAllProducts } from "@/lib/data";
import { SaleForm } from "@/components/admin/SaleForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registrar venta" };

export default async function NuevaVentaPage() {
  const products = await getAllProducts({ includeHidden: true });
  const sellable = products.filter((p) => p.stockMode === "propio");

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/ventas" label="Ventas" />
        <span>/</span>
        <span>Nueva</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Registrar venta
      </h1>
      <SaleForm products={sellable} />
    </>
  );
}
