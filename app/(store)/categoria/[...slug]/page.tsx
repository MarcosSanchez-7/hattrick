import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  byCategoryTree,
  categoryChildren,
  categoryPath,
  categorySlugPath,
  getCategory,
  isCategoryVisible,
} from "@/lib/catalog";
import { getAllCategories, getAllProducts, getAllTags } from "@/lib/data";
import { SITE_URL, buildBreadcrumbJsonLd } from "@/lib/site";
import { ProductBrowser } from "@/components/product/ProductBrowser";

type Params = { slug: string[] };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getAllCategories({ includeHidden: true });
  const category = getCategory(categories, slug[slug.length - 1]);
  if (!category || !isCategoryVisible(categories, category.slug)) {
    return { title: "Categoría no encontrada" };
  }
  const canonicalPath = `/categoria/${categorySlugPath(categories, category.slug).join("/")}`;
  const title = `${category.name} — Camisetas de fútbol`;
  return {
    title,
    description: category.description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description: category.description,
      url: canonicalPath,
      images: category.image ? [{ url: category.image }] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug: slugParts } = await params;
  // Se trae el árbol completo (incluidas categorías ocultas) para poder
  // recorrer bien la cadena de ancestros: si se filtrara antes, un ancestro
  // oculto desaparecería del árbol y rompería el cálculo de la ruta
  // canónica para sus subcategorías. La visibilidad real para el cliente se
  // decide aparte, con isCategoryVisible.
  const [categories, allProducts, tags] = await Promise.all([
    getAllCategories({ includeHidden: true }),
    getAllProducts(),
    getAllTags(),
  ]);
  const category = getCategory(categories, slugParts[slugParts.length - 1]);
  if (!category || !isCategoryVisible(categories, category.slug)) notFound();

  // El slug sigue siendo único globalmente: se resuelve por el último
  // segmento, y si la URL pedida no es la ruta canónica (ej. un link viejo
  // de un solo segmento, o la categoría fue reubicada) se redirige.
  const canonicalPath = categorySlugPath(categories, category.slug);
  if (canonicalPath.join("/") !== slugParts.join("/")) {
    permanentRedirect(`/categoria/${canonicalPath.join("/")}`);
  }

  const products = byCategoryTree(allProducts, categories, category.slug);
  const ancestors = categoryPath(categories, category.slug).slice(0, -1);
  const children = categoryChildren(categories, category.slug).filter((c) =>
    isCategoryVisible(categories, c.slug),
  );

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Inicio", url: SITE_URL },
    ...ancestors.map((a) => ({
      name: a.name,
      url: `${SITE_URL}/categoria/${categorySlugPath(categories, a.slug).join("/")}`,
    })),
    { name: category.name, url: `${SITE_URL}/categoria/${canonicalPath.join("/")}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            {ancestors.map((a) => (
              <Fragment key={a.slug}>
                <span>/</span>
                <Link href={`/categoria/${categorySlugPath(categories, a.slug).join("/")}`}>
                  {a.name}
                </Link>
              </Fragment>
            ))}
            <span>/</span>
            <span>{category.name}</span>
          </nav>
          <h1 className="h1">{category.name}</h1>
          <p className="lead" style={{ marginTop: 12 }}>
            {category.description}
          </p>

          {children.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
              {children.map((child) => (
                <Link
                  key={child.slug}
                  href={`/categoria/${categorySlugPath(categories, child.slug).join("/")}`}
                  className="chip"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <section className="section section--tight">
        <div className="container">
          <ProductBrowser products={products} tags={tags} />
        </div>
      </section>
    </>
  );
}
