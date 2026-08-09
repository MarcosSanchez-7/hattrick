import type { Metadata } from "next";
import { getAllProducts } from "@/lib/data";
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
  const products = await getAllProducts();

  return <SearchPageClient products={products} initialQuery={q.trim()} />;
}
