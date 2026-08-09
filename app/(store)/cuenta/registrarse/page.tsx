import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/auth";
import { RegisterForm } from "@/components/account/RegisterForm";

export const metadata: Metadata = { title: "Crear cuenta" };
export const dynamic = "force-dynamic";

export default async function RegistrarsePage() {
  const customer = await getCurrentCustomer();
  if (customer) redirect("/cuenta");

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Crear cuenta</span>
          </nav>
          <h1 className="h1">Crear cuenta</h1>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container" style={{ maxWidth: 420 }}>
          <RegisterForm />
        </div>
      </section>
    </>
  );
}
