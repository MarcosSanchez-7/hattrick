import { PageForm } from "@/components/admin/PageForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const metadata = { title: "Nueva página" };

export default function NewPagePage() {
  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/admin/paginas" label="Páginas" />
        <span>/</span>
        <span>Nueva</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nueva página
      </h1>
      <PageForm />
    </>
  );
}
