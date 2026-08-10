import { getSetting } from "@/lib/data";
import { DEFAULT_FOOTER } from "@/lib/settings";
import { CarritoView } from "@/components/cart/CarritoView";

export const dynamic = "force-dynamic";

export default async function CarritoPage() {
  const footerSettings = await getSetting("footer", DEFAULT_FOOTER);

  return <CarritoView whatsappNumber={footerSettings.whatsappNumber} />;
}
