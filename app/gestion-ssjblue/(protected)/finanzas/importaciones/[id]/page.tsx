import { notFound, redirect } from "next/navigation";
import { getImportCouriers, getImportPurchases } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { ImportPurchaseForm } from "@/components/admin/ImportPurchaseForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar importación" };

export default async function EditImportPurchasePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const { id } = await params;
  const [purchases, couriers] = await Promise.all([
    getImportPurchases(),
    getImportCouriers(),
  ]);
  const purchase = purchases.find((p) => p.id === id);
  if (!purchase) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/importaciones" label="Importaciones" />
        <span>/</span>
        <span>Editar</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar importación
      </h1>
      <ImportPurchaseForm purchase={purchase} couriers={couriers} />
    </>
  );
}
