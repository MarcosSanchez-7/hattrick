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
 * conteo de favoritos) y SearchOverlay + los selectores de lib/catalog.ts
 * (searchProducts/newArrivals, que exigen la forma "ProductLike" completa
 * aunque en tiempo de ejecución no lean cada campo) necesitan.
 *
 * app/(store)/layout.tsx le pasa esto a CartProvider y Navbar en vez de
 * PublicProduct completo -- quedan afuera `description`, `patches`,
 * `isVisible`, `rating` e `isCustomizable`, que ninguno de esos
 * componentes lee jamás (medido en la Fase 3: ~27 KB de 144 KB del
 * catálogo público completo, con 128 productos visibles). Las páginas que
 * sí necesitan esos campos (ficha de producto, grillas) se siguen
 * sirviendo con su propio getAllProducts() + toPublicProduct de siempre --
 * no comparten esta proyección.
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
