import { notFound, redirect } from "next/navigation";
import { getImportCouriers } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { CourierForm } from "@/components/admin/CourierForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar courier" };

export default async function EditCourierPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  const { id } = await params;
  const couriers = await getImportCouriers();
  const courier = couriers.find((c) => c.id === id);
  if (!courier) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/importaciones/couriers" label="Couriers" />
        <span>/</span>
        <span>{courier.name}</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar courier
      </h1>
      <CourierForm courier={courier} />
    </>
  );
}
