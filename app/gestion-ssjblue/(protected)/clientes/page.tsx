import Link from "next/link";
import { getCustomersWithStats } from "@/lib/data";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const customers = await getCustomersWithStats();

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue" label="Panel" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Clientes</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Se crean solos al registrar una venta con teléfono. Acá ves
            historial de compras y gasto total por persona.
          </p>
        </div>
        <Link href="/gestion-ssjblue/clientes/nueva" className="btn btn--sm">
          Nuevo cliente
        </Link>
      </div>

      <CustomersTable customers={customers} />
    </>
  );
}
