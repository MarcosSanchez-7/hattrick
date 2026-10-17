import { getAllCategories, getSetting } from "@/lib/data";
import { DEFAULT_DTF } from "@/lib/settings";
import { DtfSettingsForm } from "@/components/admin/DtfSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Taller DTF" };

export default async function DtfSettingsPage() {
  const [settings, categories] = await Promise.all([
    getSetting("dtf", DEFAULT_DTF),
    getAllCategories({ includeHidden: true }),
  ]);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Taller DTF</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Taller DTF
      </h1>
      <DtfSettingsForm initial={settings} categories={categories} />
    </>
  );
}
