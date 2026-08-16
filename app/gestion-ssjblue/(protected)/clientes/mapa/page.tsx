import { getAllCustomers } from "@/lib/data";
import { CustomersMap } from "@/components/admin/CustomersMap";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mapa de clientes" };

export default async function ClientesMapaPage() {
  const customers = await getAllCustomers();
  const located = customers.filter((c) => c.latitude != null && c.longitude != null);

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue/clientes" label="Clientes" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Mapa de clientes</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            {located.length} cliente{located.length !== 1 ? "s" : ""} con
            ubicación marcada de {customers.length} en total.
          </p>
        </div>
      </div>

      {located.length === 0 ? (
        <div className="admin-empty">
          Todavía no hay clientes con ubicación marcada. Se marca desde la
          ficha de cada cliente o al registrar una venta con su teléfono.
        </div>
      ) : (
        <div className="admin-card">
          <CustomersMap customers={customers} />
        </div>
      )}
    </>
  );
}
