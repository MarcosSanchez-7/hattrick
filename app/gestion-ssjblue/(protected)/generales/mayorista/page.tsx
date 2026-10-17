import { getSetting } from "@/lib/data";
import { DEFAULT_WHOLESALE } from "@/lib/settings";
import { WholesaleSettingsForm } from "@/components/admin/WholesaleSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mayorista" };

export default async function WholesaleSettingsPage() {
  const settings = await getSetting("wholesale", DEFAULT_WHOLESALE);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Mayorista</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Mayorista
      </h1>
      <WholesaleSettingsForm initial={settings} />
    </>
  );
}
