import { getSetting } from "@/lib/data";
import { DEFAULT_HERO } from "@/lib/settings";
import { HeroSettingsForm } from "@/components/admin/HeroSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portada (Hero)" };

export default async function HeroSettingsPage() {
  const settings = await getSetting("hero", DEFAULT_HERO);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Portada (Hero)</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Portada (Hero)
      </h1>
      <HeroSettingsForm initial={settings} />
    </>
  );
}
