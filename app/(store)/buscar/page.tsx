import type { Metadata } from "next";
import { getAllCategories, getAllProducts, getAllTags, toPublicProduct } from "@/lib/data";
import { SearchPageClient } from "@/components/search/SearchPageClient";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Busca camisetas por equipo, liga, temporada o color.",
  alternates: { canonical: "/buscar" },
};

export const dynamic = "force-dynamic";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [allProducts, tags, categories] = await Promise.all([
    getAllProducts(),
    getAllTags(),
    getAllCategories(),
  ]);
  // SearchPageClient es Client Component -- se mapea a la versión pública
  // antes de pasarla en vez del Product completo (ver toPublicProduct en lib/data.ts).
  const products = allProducts.map(toPublicProduct);

  return (
    <SearchPageClient
      products={products}
      tags={tags}
      categories={categories}
      initialQuery={q.trim()}
    />
  );
}
