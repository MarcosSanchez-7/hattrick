import "server-only";
import type { Product } from "@/lib/catalog";
import { hasPermission, type AdminRole } from "@/lib/admin-auth";

/** Campos de producto que viewer puede consultar desde las APIs administrativas.
 * Esta forma no contiene precios internos, control ni datos de proveedores. */
export type ViewerAdminProduct = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "category"
  | "price"
  | "compareAt"
  | "isVisible"
  | "isNew"
  | "rating"
  | "reviews"
  | "stockMode"
  | "variants"
  | "sizes"
  | "soldOut"
  | "createdAt"
  | "colors"
  | "pattern"
  | "description"
  | "tags"
  | "images"
  | "isCustomizable"
  | "patches"
>;

/** Datos mínimos de inventario que viewer puede consultar. */
export type ViewerInventoryProduct = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "category"
  | "price"
  | "compareAt"
  | "isVisible"
  | "isNew"
  | "reviews"
  | "stockMode"
  | "variants"
  | "sizes"
  | "soldOut"
  | "createdAt"
  | "tags"
  | "colors"
  | "pattern"
  | "images"
>;

/** Vendedor ve el mismo inventario operativo y su precio mayorista de venta. */
export type VendedorInventoryProduct = ViewerInventoryProduct & Pick<Product, "wholesalePrice">;

/**
 * La API de productos carga el objeto administrativo completo. Viewer nunca
 * recibe una copia de ese objeto: la lista permitida se construye de forma
 * explícita antes de serializar JSON.
 */
export function projectViewerAdminProduct(product: Product): ViewerAdminProduct {
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
    stockMode: product.stockMode,
    variants: product.variants,
    sizes: product.sizes,
    soldOut: product.soldOut,
    createdAt: product.createdAt,
    colors: product.colors,
    pattern: product.pattern,
    description: product.description,
    tags: product.tags,
    images: product.images,
    isCustomizable: product.isCustomizable,
    patches: product.patches,
  };
}

export function projectViewerInventoryProduct(product: Product): ViewerInventoryProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    compareAt: product.compareAt,
    isVisible: product.isVisible,
    isNew: product.isNew,
    reviews: product.reviews,
    stockMode: product.stockMode,
    variants: product.variants,
    sizes: product.sizes,
    soldOut: product.soldOut,
    createdAt: product.createdAt,
    tags: product.tags,
    colors: product.colors,
    pattern: product.pattern,
    images: product.images,
  };
}

export function projectVendedorInventoryProduct(product: Product): VendedorInventoryProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    wholesalePrice: product.wholesalePrice,
    compareAt: product.compareAt,
    isVisible: product.isVisible,
    isNew: product.isNew,
    reviews: product.reviews,
    stockMode: product.stockMode,
    variants: product.variants,
    sizes: product.sizes,
    soldOut: product.soldOut,
    createdAt: product.createdAt,
    tags: product.tags,
    colors: product.colors,
    pattern: product.pattern,
    images: product.images,
  };
}

export function redactProductForRole(
  product: Product,
  role: AdminRole,
): Product | ViewerAdminProduct {
  if (hasPermission(role, "products.write") && hasPermission(role, "suppliers.read")) {
    return product;
  }
  return projectViewerAdminProduct(product);
}

export function redactProductsForRole(
  products: Product[],
  role: AdminRole,
): Array<Product | ViewerAdminProduct> {
  return products.map((product) => redactProductForRole(product, role));
}
