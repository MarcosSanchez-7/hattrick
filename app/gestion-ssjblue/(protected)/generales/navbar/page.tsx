import { getSetting } from "@/lib/data";
import { DEFAULT_NAVBAR } from "@/lib/settings";
import { NavbarSettingsForm } from "@/components/admin/NavbarSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Menú y avisos" };

export default async function NavbarSettingsPage() {
  const settings = await getSetting("navbar", DEFAULT_NAVBAR);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Menú y avisos</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Menú y avisos
      </h1>
      <NavbarSettingsForm initial={settings} />
    </>
  );
}
