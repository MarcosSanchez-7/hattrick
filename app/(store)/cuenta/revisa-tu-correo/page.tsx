import type { Metadata } from "next";
import Link from "next/link";
import { IconCheck } from "@/components/ui/Icons";

export const metadata: Metadata = { title: "Revisá tu correo" };

export default async function RevisaTuCorreoPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="empty-state">
          <IconCheck />
          <h2 className="h2">Revisá tu correo</h2>
          <p className="meta" style={{ maxWidth: "44ch" }}>
            {email ? (
              <>
                Te enviamos un enlace de confirmación a <strong>{email}</strong>.
                Hacé clic en el enlace para activar tu cuenta.
              </>
            ) : (
              "Te enviamos un enlace de confirmación. Hacé clic en el enlace para activar tu cuenta."
            )}
          </p>
          <Link href="/" className="btn btn--sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
