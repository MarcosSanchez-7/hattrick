import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/auth";
import { LogoutButton } from "@/components/account/LogoutButton";

export const metadata: Metadata = { title: "Mi cuenta" };
export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/cuenta/iniciar-sesion");

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Mi cuenta</span>
          </nav>
          <h1 className="h1">Mi cuenta</h1>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container" style={{ maxWidth: 480 }}>
          <div className="admin-card" style={{ padding: 24 }}>
            <p className="label" style={{ color: "var(--ink-muted)" }}>
              Nombre
            </p>
            <p style={{ fontWeight: 600, marginBottom: 16 }}>
              {customer.fullName ?? "—"}
            </p>
            <p className="label" style={{ color: "var(--ink-muted)" }}>
              Correo
            </p>
            <p style={{ fontWeight: 600, marginBottom: 24 }}>{customer.email}</p>
            <LogoutButton />
          </div>
        </div>
      </section>
    </>
  );
}
