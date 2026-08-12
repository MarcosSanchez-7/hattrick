import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-session";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");

  return (
    <AdminShell role={admin.role} name={admin.name}>
      {children}
    </AdminShell>
  );
}
