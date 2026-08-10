import type { Metadata } from "next";
import { getAllProducts, getAllTags } from "@/lib/data";
import { SearchPageClient } from "@/components/search/SearchPageClient";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Busca camisetas por equipo, liga, temporada o color.",
};

export const dynamic = "force-dynamic";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [products, tags] = await Promise.all([getAllProducts(), getAllTags()]);

  return <SearchPageClient products={products} tags={tags} initialQuery={q.trim()} />;
}
