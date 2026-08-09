import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/auth";
import { LoginForm } from "@/components/account/LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };
export const dynamic = "force-dynamic";

export default async function IniciarSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const customer = await getCurrentCustomer();
  if (customer) redirect("/cuenta");

  const { error } = await searchParams;

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Iniciar sesión</span>
          </nav>
          <h1 className="h1">Iniciar sesión</h1>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container" style={{ maxWidth: 420 }}>
          {error === "enlace_invalido" ? (
            <p className="admin-error" style={{ marginBottom: 16 }}>
              Ese enlace de confirmación ya no es válido. Iniciá sesión o
              registrate de nuevo.
            </p>
          ) : null}
          <LoginForm />
        </div>
      </section>
    </>
  );
}
