import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { byCategory, getCategory } from "@/lib/catalog";
import { getAllCategories, getAllProducts } from "@/lib/data";
import { ProductBrowser } from "@/components/product/ProductBrowser";

type Params = { slug: string };
type Search = { liga?: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(await getAllCategories(), slug);
  if (!category) return { title: "Categoría no encontrada" };
  return {
    title: `${category.name} — Camisetas de fútbol`,
    description: category.description,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const { liga } = await searchParams;
  const [categories, allProducts] = await Promise.all([
    getAllCategories(),
    getAllProducts(),
  ]);
  const category = getCategory(categories, slug);
  if (!category) notFound();

  const products = byCategory(allProducts, category.slug);

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>{category.name}</span>
          </nav>
          <h1 className="h1">{category.name}</h1>
          <p className="lead" style={{ marginTop: 12 }}>
            {category.description}
          </p>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container">
          <ProductBrowser products={products} initialLeague={liga ?? "Todas"} />
        </div>
      </section>
    </>
  );
}
