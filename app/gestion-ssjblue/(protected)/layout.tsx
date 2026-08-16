import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-session";
import { AdminShell } from "@/components/admin/AdminShell";
// Solo el admin usa mapas (mapa de clientes, ubicación de entrega) — se
// importa acá, no en el layout raíz, para no sumarle peso a la tienda.
import "leaflet/dist/leaflet.css";

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
