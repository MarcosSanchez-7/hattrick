import type { MetadataRoute } from "next";
import { categorySlugPath } from "@/lib/catalog";
import { getAllCategories, getAllPages, getAllProducts } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Los getters sin `includeHidden` ya devuelven solo lo visible al público
  // (y, para productos, excluyen los que cuelgan de una categoría oculta).
  const [categories, products, pages] = await Promise.all([
    getAllCategories(),
    getAllProducts(),
    getAllPages(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/novedades`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/ofertas`, changeFrequency: "daily", priority: 0.8 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/categoria/${categorySlugPath(categories, c.slug).join("/")}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/producto/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const pageRoutes: MetadataRoute.Sitemap = pages.map((p) => ({
    url: `${SITE_URL}/pagina/${p.slug}`,
    changeFrequency: "monthly",
    priority: 0.3,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...pageRoutes];
}
