import { getSetting } from "@/lib/data";
import { DEFAULT_VALUE_PROPS } from "@/lib/settings";
import { ValuePropsSettingsForm } from "@/components/admin/ValuePropsSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Franja de información" };

export default async function ValuePropsPage() {
  const settings = await getSetting("valueProps", DEFAULT_VALUE_PROPS);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Franja de información</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Franja de información
      </h1>
      <ValuePropsSettingsForm initial={settings} />
    </>
  );
}
