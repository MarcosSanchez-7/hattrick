import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-session";
import { FinanceAccountForm } from "@/components/admin/FinanceAccountForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva cuenta" };

export default async function NewFinanceAccountPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "superadmin") redirect("/gestion-ssjblue");

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/finanzas/cuentas" label="Cuentas y tarjetas" />
        <span>/</span>
        <span>Nueva</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nueva cuenta
      </h1>
      <FinanceAccountForm />
    </>
  );
}
