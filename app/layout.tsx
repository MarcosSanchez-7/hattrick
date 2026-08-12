import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE_DEFAULT = "HATTRICK · Camisetas de fútbol oficiales";
const DESCRIPTION =
  "Tienda de camisetas de fútbol: equipaciones de clubes y selecciones, retro, entrenamiento y kits infantiles. Personalización oficial y envío en 48 h.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: "%s · HATTRICK",
  },
  description: DESCRIPTION,
  keywords: [
    "camisetas de fútbol",
    "equipaciones",
    "camisetas retro",
    "selecciones",
    "personalización",
  ],
  openGraph: {
    type: "website",
    locale: "es_PY",
    siteName: SITE_NAME,
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
