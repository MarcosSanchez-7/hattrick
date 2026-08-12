import { notFound, redirect } from "next/navigation";
import { getMerchandisePurchases } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { PurchaseForm } from "@/components/admin/PurchaseForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar compra" };

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const { id } = await params;
  const purchases = await getMerchandisePurchases();
  const purchase = purchases.find((p) => p.id === id);
  if (!purchase) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/compras" label="Compras" />
        <span>/</span>
        <span>Editar</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar compra
      </h1>
      <PurchaseForm purchase={purchase} />
    </>
  );
}
