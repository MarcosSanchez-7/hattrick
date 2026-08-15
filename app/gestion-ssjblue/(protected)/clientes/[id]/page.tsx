import { notFound } from "next/navigation";
import { getAllCustomers, getCustomerSales } from "@/lib/data";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { CustomerPurchaseHistory } from "@/components/admin/CustomerPurchaseHistory";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar cliente" };

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const customers = await getAllCustomers();
  const customer = customers.find((c) => c.id === id);
  if (!customer) notFound();

  const sales = await getCustomerSales(id);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/clientes" label="Clientes" />
        <span>/</span>
        <span>{customer.name}</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        {customer.name}
      </h1>
      <CustomerForm customer={customer} />

      <p className="h3" style={{ fontSize: "0.9375rem", marginTop: 40, marginBottom: 12 }}>
        Historial de compras
      </p>
      <CustomerPurchaseHistory sales={sales} />
    </>
  );
}
