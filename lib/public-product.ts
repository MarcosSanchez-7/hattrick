// Proyecciones puras para datos que cruzan el límite público de la tienda.
// No importa Supabase ni Next para que las reglas de disponibilidad y el
// contrato puedan verificarse con node:test sin infraestructura.
import {
  isPatchAvailable,
  type Patch,
  type Pattern,
  type Product,
  type ProductVariant,
  type StockMode,
} from "./catalog.ts";

/** Variante pública: la ficha necesita disponibilidad, nunca la cantidad. */
export type PublicProductVariant = {
  id: string;
  size: string;
  inStock: boolean;
};

/**
 * El selector público de parches solo necesita identificar, mostrar y
 * cotizar un parche disponible. `isAvailable` se deriva en servidor desde
 * `isVisible && stock > 0`; ni el stock exacto ni la categoría administrativa
 * cruzan a React Flight.
 */
export type PublicPatch = {
  id: string;
  name: string;
  images: string[];
  price: number;
  isAvailable: boolean;
};

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  compareAt?: number | null;
  isVisible: boolean;
  isNew?: boolean;
  rating: number;
  reviews: number;
  variants?: PublicProductVariant[];
  sizes: string[];
  soldOut?: string[];
  colors: { primary: string; secondary: string; accent: string };
  pattern: Pattern;
  description: string;
  tags: string[];
  images?: string[];
  isCustomizable?: boolean;
  patches?: PublicPatch[];
  createdAt: string;
};

export type PublicPatchSource = Pick<
  Patch,
  "id" | "name" | "images" | "price" | "isVisible" | "stock"
>;

/** Forma que comparten Product y la hidratación pública desde PostgREST. */
export type PublicProductSource = Omit<PublicProduct, "variants" | "patches"> & {
  stockMode: StockMode;
  variants?: ProductVariant[];
  patches?: PublicPatchSource[];
};

export function publicProductVariants(
  stockMode: StockMode,
  variants: ProductVariant[] | undefined,
): PublicProductVariant[] | undefined {
  if (stockMode !== "propio") return undefined;
  return variants?.map((variant) => ({
    id: variant.id,
    size: variant.size,
    inStock: variant.stock > 0,
  }));
}

/**
 * Conserva la regla existente: solo stock propio ofrece talles y agotados.
 * `internalControl` nunca participa porque es un detalle estrictamente
 * administrativo de ajeno/importado.
 */
export function publicProductAvailability(
  stockMode: StockMode,
  variants: ProductVariant[],
): Pick<PublicProduct, "variants" | "sizes" | "soldOut"> {
  if (stockMode !== "propio") return { variants: undefined, sizes: [], soldOut: [] };
  return {
    variants: publicProductVariants(stockMode, variants),
    sizes: variants.map((variant) => variant.size),
    soldOut: variants.filter((variant) => variant.stock <= 0).map((variant) => variant.size),
  };
}

export function toPublicPatch(patch: PublicPatchSource): PublicPatch {
  return {
    id: patch.id,
    name: patch.name,
    images: patch.images,
    price: patch.price,
    isAvailable: isPatchAvailable(patch),
  };
}

export function toPublicProductFromSource(product: PublicProductSource): PublicProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    compareAt: product.compareAt,
    isVisible: product.isVisible,
    isNew: product.isNew,
    rating: product.rating,
    reviews: product.reviews,
    variants: publicProductVariants(product.stockMode, product.variants),
    sizes: product.sizes,
    soldOut: product.soldOut,
    colors: product.colors,
    pattern: product.pattern,
    description: product.description,
    tags: product.tags,
    images: product.images,
    isCustomizable: product.isCustomizable,
    patches: product.patches?.map(toPublicPatch),
    createdAt: product.createdAt,
  };
}

/** Convierte el Product administrativo sin exponer sus campos internos. */
export function toPublicProduct(product: Product): PublicProduct {
  return toPublicProductFromSource(product);
}
