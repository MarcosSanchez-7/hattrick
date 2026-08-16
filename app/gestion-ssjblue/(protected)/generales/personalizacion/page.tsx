import { getSetting } from "@/lib/data";
import { DEFAULT_CUSTOM_BANNER, DEFAULT_PERSONALIZATION_GALLERY } from "@/lib/settings";
import { CustomBannerSettingsForm } from "@/components/admin/CustomBannerSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Banner de personalización" };

export default async function CustomBannerSettingsPage() {
  const [settings, gallery] = await Promise.all([
    getSetting("customBanner", DEFAULT_CUSTOM_BANNER),
    getSetting("personalizationGallery", DEFAULT_PERSONALIZATION_GALLERY),
  ]);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Banner de personalización</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Banner de personalización
      </h1>
      <CustomBannerSettingsForm initial={settings} initialGallery={gallery} />
    </>
  );
}
