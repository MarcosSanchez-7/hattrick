import { getAllQrCampaigns } from "@/lib/data";
import { QrCampaignsManager } from "@/components/admin/QrCampaignsManager";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Códigos QR" };

export default async function QrCampaignsPage() {
  const campaigns = await getAllQrCampaigns();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Códigos QR</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 8 }}>
        Códigos QR
      </h1>
      <p className="lead" style={{ marginBottom: 24, fontSize: "0.9375rem" }}>
        Cada código QR (bolsas de envío, flyer, cartel del local, etc.) tiene
        su propio link — al escanearse suma acá y también queda registrado en
        Vercel Analytics. Generá la imagen del QR con ese link, no con la URL
        de la tienda directa, para poder medir cuánta gente entra por ahí.
      </p>
      <QrCampaignsManager initial={campaigns} />
    </>
  );
}
