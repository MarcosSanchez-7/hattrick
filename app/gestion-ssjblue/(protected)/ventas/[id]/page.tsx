import { notFound } from "next/navigation";
import { getAllCustomers, getAllProducts, getSaleById } from "@/lib/data";
import { SaleForm } from "@/components/admin/SaleForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar venta" };

export default async function EditarVentaPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const [sale, products, customers] = await Promise.all([
    getSaleById(id),
    getAllProducts({ includeHidden: true }),
    getAllCustomers(),
  ]);
  if (!sale) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/ventas" label="Ventas" />
        <span>/</span>
        <span>Editar</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar venta
      </h1>
      <SaleForm sale={sale} products={products} customers={customers} />
    </>
  );
}
