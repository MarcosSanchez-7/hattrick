import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Panel de administración",
    template: "%s · Admin HATTRICK",
  },
  robots: { index: false, follow: false },
};

/**
 * Compartido por /gestion-ssjblue/login, /gestion-ssjblue/setup y por el grupo (protected) —
 * a propósito no lleva la barra lateral: eso vive en
 * app/gestion-ssjblue/(protected)/layout.tsx, que es quien exige sesión.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
