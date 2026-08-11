import { getSetting } from "@/lib/data";
import { DEFAULT_PRODUCT_NOTICES } from "@/lib/settings";
import { ProductNoticesSettingsForm } from "@/components/admin/ProductNoticesSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avisos del producto" };

export default async function ProductNoticesPage() {
  const settings = await getSetting("productNotices", DEFAULT_PRODUCT_NOTICES);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/admin/generales" label="Generales" />
        <span>/</span>
        <span>Avisos del producto</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Avisos del producto
      </h1>
      <p className="lead" style={{ marginTop: -16, marginBottom: 24, fontSize: "0.9375rem" }}>
        Estos son los avisos de respaldo. Cada categoría puede tener los
        suyos propios desde Categorías → Editar.
      </p>
      <ProductNoticesSettingsForm initial={settings} />
    </>
  );
}
