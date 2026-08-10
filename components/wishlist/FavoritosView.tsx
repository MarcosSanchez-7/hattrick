"use client";

import Link from "next/link";
import type { Product, Tag } from "@/lib/catalog";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { ProductGrid } from "@/components/product/ProductCard";
import { IconHeart } from "@/components/ui/Icons";

export function FavoritosView({
  products,
  tags = [],
}: {
  products: Product[];
  tags?: Tag[];
}) {
  const { slugs, hydrated } = useWishlist();
  const saved = products.filter((p) => slugs.includes(p.slug));

  if (!hydrated) return null;

  if (saved.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <IconHeart />
          <h2 className="h2">Todavía no tienes favoritos</h2>
          <p className="meta" style={{ maxWidth: "44ch" }}>
            Guarda las camisetas que te interesan tocando el corazón en
            cualquier producto y las encontrarás acá.
          </p>
          <div className="row gap-3">
            <Link href="/novedades" className="btn btn--sm">
              Ver novedades
            </Link>
            <Link href="/ofertas" className="btn btn--ghost btn--sm">
              Ver ofertas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <ProductGrid products={saved} tags={tags} />
    </div>
  );
}
