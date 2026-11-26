import type { MetadataRoute } from "next";
import { categorySlugPath } from "@/lib/catalog";
import { getAllCategories, getAllPages, getSitemapProducts, hiddenCategorySlugs } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Fase 5: antes force-dynamic (recalculaba todo en cada request, 8
// consultas a Supabase medidas en el entorno local -- 4 de ellas
// variantes/parches/proveedores/stock por talla que este archivo nunca
// usa). Un sitemap cacheado 1h es, por su propia naturaleza, exactamente
// el tipo de documento para el que ISR existe: lo pide un crawler, no un
// visitante esperando el dato más fresco posible. Las operaciones
// administrativas que agregan/ocultan/borran/mueven un producto o una
// página ya no disparan ninguna invalidación selectiva de /sitemap.xml
// hoy (ver el análisis de consistencia de la Fase 5) -- este TTL de 1h es
// la única garantía de que esos cambios lleguen a aparecer, no una red de
// respaldo como en las páginas públicas (Fase 4C).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // includeHidden:true: necesario para poder resolver la cadena de
  // ancestros de cualquier categoría (categorySlugPath camina hacia
  // arriba) incluso si algún ancestro estuviera oculto -- la visibilidad
  // real para el listado de categorías del sitemap se decide aparte, con
  // hiddenCategorySlugs, igual que ya hace getAllProducts() internamente
  // (ver lib/data.ts). getSitemapProducts() también necesita esta lista
  // completa para filtrar productos. La medición histórica de la Fase 5
  // observó dos consultas a `categories` durante una regeneración (4
  // consultas totales: productos 1, categorías 2, páginas 1); no se
  // atribuye aquí una causa interna definitiva a esa distribución.
  const [categories, products, pages] = await Promise.all([
    getAllCategories({ includeHidden: true }),
    getSitemapProducts(),
    getAllPages(),
  ]);

  const hiddenSlugs = hiddenCategorySlugs(categories);
  const visibleCategories = categories.filter((c) => !hiddenSlugs.has(c.slug));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/novedades`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/ofertas`, changeFrequency: "daily", priority: 0.8 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = visibleCategories.map((c) => ({
    url: `${SITE_URL}/categoria/${categorySlugPath(categories, c.slug).join("/")}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // lastModified: products.updated_at es real (columna mantenida por un
  // trigger de Postgres en cada UPDATE, ver supabase/schema.sql) -- nunca
  // la fecha de esta regeneración. categories/pages NO tienen una columna
  // de modificación real en el esquema actual (solo created_at, que es la
  // fecha de ALTA, no de la última edición) -- se omite lastModified en
  // esos casos en vez de inventar uno; agregar esa columna requeriría
  // tocar supabase/schema.sql, fuera de alcance de esta fase (ver
  // limitaciones en el reporte).
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/producto/${p.slug}`,
    lastModified: new Date(p.updatedAt),
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
