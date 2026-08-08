import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HATTRICK · Camisetas de fútbol oficiales",
    template: "%s · HATTRICK",
  },
  description:
    "Tienda de camisetas de fútbol: equipaciones de clubes y selecciones, retro, entrenamiento y kits infantiles. Personalización oficial y envío en 48 h.",
  keywords: [
    "camisetas de fútbol",
    "equipaciones",
    "camisetas retro",
    "selecciones",
    "personalización",
  ],
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
