import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPages } from "@/lib/data";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pages = await getAllPages();
  const page = pages.find((p) => p.slug === slug);
  if (!page) return { title: "Página no encontrada" };
  return { title: page.title };
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
