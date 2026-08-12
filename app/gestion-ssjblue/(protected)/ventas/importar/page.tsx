import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { SalesImportForm } from "@/components/admin/SalesImportForm";

export const metadata = { title: "Importar ventas" };

export default function ImportSalesPage() {
  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/ventas" label="Ventas" />
        <span>/</span>
        <span>Importar</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Importar ventas desde CSV
      </h1>
      <SalesImportForm />
    </>
  );
}
