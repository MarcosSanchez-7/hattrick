import { getSetting } from "@/lib/data";
import { DEFAULT_BRANDING } from "@/lib/settings";
import { BrandingSettingsForm } from "@/components/admin/BrandingSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Branding" };

export default async function BrandingSettingsPage() {
  const settings = await getSetting("branding", DEFAULT_BRANDING);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Branding</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Branding
      </h1>
      <BrandingSettingsForm initial={settings} />
    </>
  );
}
