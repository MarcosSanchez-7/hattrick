import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPages } from "@/lib/data";

type Params = { slug: string };

// Fase 4C: 86400s -- editar solo el body invalida selectivamente esta
// página; editar título/placement/sortOrder invalida globalmente (afecta
// el Footer, ver pageAffectsFooter en lib/revalidate-core.ts). Ambos casos
// ya son on demand, confirmado con los 28 escenarios de integración de la
// Fase 4B.3. El TTL es un respaldo generoso, no la vía principal.
export const revalidate = 86400;

// Sin esto, revalidate=86400 no hace nada en un segmento dinamico ([slug])
// -- ver la misma nota en producto/[slug]/page.tsx.
export async function generateStaticParams() {
  const pages = await getAllPages();
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pages = await getAllPages();
  const page = pages.find((p) => p.slug === slug);
  if (!page) return { title: "Página no encontrada" };
  return {
    title: page.title,
    alternates: { canonical: `/pagina/${page.slug}` },
  };
}

export default async function ContentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const pages = await getAllPages();
  const page = pages.find((p) => p.slug === slug);
  if (!page) notFound();

  const paragraphs = page.body.split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>{page.title}</span>
          </nav>
          <h1 className="h1">{page.title}</h1>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="stack gap-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="lead" style={{ fontSize: "1rem" }}>
                {p.trim()}
              </p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
