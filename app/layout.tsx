import type { Metadata, Viewport } from "next";
import { AnalyticsWithOptOut } from "@/components/analytics/AnalyticsWithOptOut";
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

// Sin esto, Android Chrome puede aplicar su "tema oscuro forzado" a la
// página (el sitio no tiene modo oscuro real) y desarma colores puntuales
// como el texto de los botones de talla en el selector rápido del home,
// dejándolo invisible sobre el fondo. La propiedad CSS color-scheme en
// globals.css no alcanza sola — hace falta también esta <meta> en el head.
export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <AnalyticsWithOptOut />
      </body>
    </html>
  );
}
