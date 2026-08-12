import Link from "next/link";
import { redirect } from "next/navigation";
import { getImportCouriers } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { CouriersTable } from "@/components/admin/CouriersTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Couriers" };

export default async function CouriersPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const couriers = await getImportCouriers();

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue/finanzas/importaciones" label="Importaciones" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Couriers</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Costo por kilo de cada courier, para calcular el flete al
            registrar una importación.
          </p>
        </div>
        <Link
          href="/gestion-ssjblue/finanzas/importaciones/couriers/nueva"
          className="btn btn--sm"
        >
          Nuevo courier
        </Link>
      </div>

      <CouriersTable couriers={couriers} />
    </>
  );
}
