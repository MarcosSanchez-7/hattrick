import type { Metadata } from "next";
import Link from "next/link";
import { getAllProducts, getAllTags } from "@/lib/data";
import { FavoritosView } from "@/components/wishlist/FavoritosView";

export const metadata: Metadata = {
  title: "Favoritos",
  description: "Las camisetas que guardaste para más tarde.",
  alternates: { canonical: "/favoritos" },
};

export const dynamic = "force-dynamic";

export default async function FavoritosPage() {
  const [products, tags] = await Promise.all([getAllProducts(), getAllTags()]);

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Favoritos</span>
          </nav>
          <h1 className="h1">Tus favoritos</h1>
        </div>
      </header>

      <section className="section section--tight">
        <FavoritosView products={products} tags={tags} />
      </section>
    </>
  );
}
