import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/data";
import { DEFAULT_CUSTOM_BANNER } from "@/lib/settings";
import { CustomBanner } from "@/components/home/CustomBanner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Personalización",
  description: "Personaliza cualquier camiseta del catálogo con nombre y dorsal.",
};

export default async function PersonalizacionPage() {
  const settings = await getSetting("customBanner", DEFAULT_CUSTOM_BANNER);

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Personalización</span>
          </nav>
        </div>
      </header>

      <CustomBanner settings={settings} />
    </>
  );
}
