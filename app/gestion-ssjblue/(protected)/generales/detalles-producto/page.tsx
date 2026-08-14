import { getSetting } from "@/lib/data";
import { DEFAULT_PRODUCT_INFO } from "@/lib/settings";
import { ProductInfoSettingsForm } from "@/components/admin/ProductInfoSettingsForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Envíos del producto" };

export default async function ProductInfoPage() {
  const settings = await getSetting("productInfo", DEFAULT_PRODUCT_INFO);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Envíos del producto</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Envíos del producto
      </h1>
      <p className="lead" style={{ marginTop: -16, marginBottom: 24, fontSize: "0.9375rem" }}>
        Texto de la sección "Envíos y devoluciones" en la ficha de cada
        producto — general para todo el catálogo.
      </p>
      <ProductInfoSettingsForm initial={settings} />
    </>
  );
}
