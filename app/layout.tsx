import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE_DEFAULT = "Camisetas de Fútbol en Paraguay | HATTRICK";
const DESCRIPTION =
  "Comprá camisetas de fútbol en Paraguay: Cerro Porteño, Olimpia, clubes europeos, selecciones y ediciones retro. Consultá talles y hacé tu pedido por WhatsApp con envío a todo el país.";

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
