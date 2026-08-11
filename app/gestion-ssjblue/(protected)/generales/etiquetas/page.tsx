import { getAllTags } from "@/lib/data";
import { TagsManager } from "@/components/admin/TagsManager";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Etiquetas" };

export default async function TagsPage() {
  const tags = await getAllTags();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
        <span>/</span>
        <span>Etiquetas</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 8 }}>
        Etiquetas
      </h1>
      <p className="lead" style={{ marginBottom: 24, fontSize: "0.9375rem" }}>
        Etiquetas estandarizadas (ej. "Versión Fan", "Bajo pedido") con su
        color, para elegirlas rápido al cargar un producto.
      </p>
      <TagsManager initial={tags} />
    </>
  );
}
