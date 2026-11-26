// Sin "server-only" ni imports con alias "@/" a propósito: esta proyección
// es pura (sin Supabase, sin next/cache) y se puede correr con Node nativo
// (ver lib/shared-catalog-product.test.ts, `node --test`) sin instalar
// nada -- mismo patrón que lib/revalidate-core.ts. El import de catalog.ts
// usa extensión .ts explícita porque Node ESM la exige en imports
// relativos (a diferencia del bundler de Next).
import type { Pattern } from "./catalog.ts";

export type SharedCatalogProductVariant = {
  id: string;
  size: string;
  inStock: boolean;
};

/**
 * Subconjunto de PublicProduct (ver lib/data.ts) -- exactamente los campos
 * que CartProvider/CartDrawer/CarritoView (precio, stock por talla vía
 * `variants`, miniatura, link), Navbar (solo `slug`, para reconciliar el
 * conteo de favoritos), SearchOverlay y los selectores de lib/catalog.ts
 * (searchProducts/newArrivals, que exigen la forma "ProductLike" completa
 * aunque en tiempo de ejecución no lean cada campo) necesitan.
 *
 * Quedan afuera `description`, `patches`, `isVisible`, `rating` e
 * `isCustomizable` (medido en la Fase 3: ~27 KB de 144 KB del catálogo
 * público completo, con 128 productos visibles). Desde la Fase 7B.5-B,
 * esta es también la proyección de TODOS los listados públicos (home,
 * categoría, novedades, ofertas, /buscar, favoritos vía
 * getPublicCatalogProducts() en lib/data.ts) -- confirmado campo por
 * campo que ProductCard/ProductGrid/ProductBrowser/CategoryGrid tampoco
 * leen esos cinco campos. Solo la ficha de producto y sus relacionados
 * (getProductBySlug()/getProductsByIds(), que sí necesitan `patches`)
 * siguen sirviéndose con PublicProduct completo.
 */
export type SharedCatalogProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  compareAt?: number | null;
  isNew?: boolean;
  reviews: number;
  variants?: SharedCatalogProductVariant[];
  sizes: string[];
  soldOut?: string[];
  colors: { primary: string; secondary: string; accent: string };
  pattern: Pattern;
  tags: string[];
  images?: string[];
  createdAt: string;
};

/**
 * Genérica sobre `T extends SharedCatalogProduct` (en vez de tipar el
 * parámetro directamente como PublicProduct) para no importar lib/data.ts
 * acá -- ese archivo depende de Supabase y no podría cargarse con Node
 * nativo en los tests. PublicProduct ya cumple esta forma de sobra (tiene
 * estos mismos campos, con los mismos tipos, más los que se descartan
 * acá), así que sigue siendo type-safe sin ningún `as`/`any`.
 */
export function toSharedCatalogProduct<T extends SharedCatalogProduct>(
  product: T,
): SharedCatalogProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    compareAt: product.compareAt,
    isNew: product.isNew,
    reviews: product.reviews,
    variants: product.variants,
    sizes: product.sizes,
    soldOut: product.soldOut,
    colors: product.colors,
    pattern: product.pattern,
    tags: product.tags,
    images: product.images,
    createdAt: product.createdAt,
  };
}
