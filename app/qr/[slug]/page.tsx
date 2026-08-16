import { recordQrScan } from "@/lib/data";
import { QrRedirect } from "@/components/ui/QrRedirect";

// Nunca cachear esta página: cada escaneo tiene que sumar en Supabase.
export const dynamic = "force-dynamic";
export const metadata = { title: "Redirigiendo…" };

export default async function QrScanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await recordQrScan(slug);
  return <QrRedirect to="/" />;
}
