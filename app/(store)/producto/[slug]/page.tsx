import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryPath, categorySlugPath, getProduct, relatedTo } from "@/lib/catalog";
import { getAllCategories, getAllProducts } from "@/lib/data";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductGrid } from "@/components/product/ProductCard";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(await getAllProducts(), slug);
  if (!product) return { title: "Producto no encontrado" };
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);
  const product = getProduct(products, slug);
  if (!product) notFound();

  const path = categoryPath(categories, product.category);
  const category = path[path.length - 1];
  const categoryHref = `/categoria/${categorySlugPath(categories, product.category).join("/")}`;
  const related = relatedTo(products, product);

  return (
    <>
      <div className="container" style={{ paddingTop: 24 }}>
        <nav className="breadcrumbs" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          {path.map((c) => (
            <Fragment key={c.slug}>
              <span>/</span>
              <Link href={`/categoria/${categorySlugPath(categories, c.slug).join("/")}`}>
                {c.name}
              </Link>
            </Fragment>
          ))}
          <span>/</span>
          <span>{product.name}</span>
        </nav>
      </div>

      <ProductDetail product={product} />

      {related.length > 0 ? (
        <section className="section section--soft">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="label section-head__eyebrow">
                  También te puede interesar
                </span>
                <h2 className="h1">Completa tu equipación</h2>
              </div>
              <Link href={categoryHref} className="section-head__link">
                Ver {category?.name}
              </Link>
            </div>
            <ProductGrid products={related} />
          </div>
        </section>
      ) : null}
    </>
  );
}
