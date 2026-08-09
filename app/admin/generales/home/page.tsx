import { getSetting } from "@/lib/data";
import { DEFAULT_HOME } from "@/lib/settings";
import { HomeSettingsForm } from "@/components/admin/HomeSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Secciones de la home" };

export default async function HomeSettingsPage() {
  const settings = await getSetting("home", DEFAULT_HOME);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/admin/generales" label="Generales" />
        <span>/</span>
        <span>Secciones de la home</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Secciones de la home
      </h1>
      <HomeSettingsForm initial={settings} />
    </>
  );
}
