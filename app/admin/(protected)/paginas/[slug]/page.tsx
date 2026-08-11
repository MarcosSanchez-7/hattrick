import { notFound } from "next/navigation";
import { getAllPages } from "@/lib/data";
import { PageForm } from "@/components/admin/PageForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { slug: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar página" };

export default async function EditPagePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const pages = await getAllPages();
  const page = pages.find((p) => p.slug === slug);
  if (!page) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/admin/paginas" label="Páginas" />
        <span>/</span>
        <span>{page.title}</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar página
      </h1>
      <PageForm page={page} />
    </>
  );
}
