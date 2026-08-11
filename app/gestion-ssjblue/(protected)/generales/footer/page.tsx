import { getSetting } from "@/lib/data";
import { DEFAULT_FOOTER } from "@/lib/settings";
import { FooterSettingsForm } from "@/components/admin/FooterSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Footer" };

export default async function FooterSettingsPage() {
  const settings = await getSetting("footer", DEFAULT_FOOTER);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Footer</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Footer
      </h1>
      <FooterSettingsForm initial={settings} />
    </>
  );
}
