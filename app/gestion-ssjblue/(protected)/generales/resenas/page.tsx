import { getSetting } from "@/lib/data";
import { DEFAULT_REVIEWS } from "@/lib/settings";
import { ReviewsSettingsForm } from "@/components/admin/ReviewsSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reseñas" };

export default async function ReviewsSettingsPage() {
  const settings = await getSetting("reviews", DEFAULT_REVIEWS);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Reseñas</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Reseñas
      </h1>
      <ReviewsSettingsForm initial={settings} />
    </>
  );
}
