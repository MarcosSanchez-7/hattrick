import { getSetting } from "@/lib/data";
import { DEFAULT_SALE_STATUS_COLORS } from "@/lib/settings";
import { SaleStatusColorsForm } from "@/components/admin/SaleStatusColorsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Colores de estados de venta" };

export default async function SaleStatusColorsPage() {
  const colors = await getSetting("saleStatusColors", DEFAULT_SALE_STATUS_COLORS);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Colores de estados de venta</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 8 }}>
        Colores de estados de venta
      </h1>
      <p className="lead" style={{ marginBottom: 24, fontSize: "0.9375rem" }}>
        El color de cada pastilla de estado de pago y de entrega en Ventas.
        Se guarda solo, apenas elegís un color.
      </p>
      <SaleStatusColorsForm initial={colors} />
    </>
  );
}
