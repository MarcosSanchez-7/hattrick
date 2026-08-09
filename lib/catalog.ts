/**
 * Tipos del catálogo y selectores puros.
 * Los datos en sí viven en /data/*.json y se leen a través de lib/data.ts
 * (server-only). Este módulo no toca el sistema de ficheros: sólo define
 * formas de dato y funciones de filtrado/orden reutilizables en servidor y
 * cliente.
 */

export type Pattern = "solid" | "stripes" | "hoops" | "halves" | "sash";

/**
 * propio: stock real, con cantidad por talla, gestionado por nosotros.
 * ajeno/importado: no llevamos cantidad; el cliente ve "Consultar talle".
 */
export type StockMode = "propio" | "ajeno" | "importado";

/** Talla usada en el carrito/PDP para productos sin stock por talla. */
export const CONSULT_SIZE_LABEL = "A consultar";

export type ProductVariant = {
  id: string;
  size: string;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  /** Slug de la categoría (ver Category.slug). Las categorías son dinámicas. */
  category: string;
  price: number;
  /** Precio anterior tachado. Su presencia marca el producto como oferta. */
  compareAt?: number | null;
  /** Costo del producto, para calcular ganancia en Ventas. Opcional. */
  costPrice?: number | null;
  /** false = oculto: no aparece en ningún listado ni ficha pública. */
  isVisible: boolean;
  isNew?: boolean;
  rating: number;
  reviews: number;
  stockMode: StockMode;
  /** Sólo relevante cuando stockMode === "propio"; cantidad real por talla. */
  variants?: ProductVariant[];
  sizes: string[];
  soldOut?: string[];
  colors: { primary: string; secondary: string; accent: string };
  pattern: Pattern;
  description: string;
  tags: string[];
  /** Rutas a /uploads/... subidas desde el panel. Vacío = se usa la ilustración generada. */
  images?: string[];
};

export type Category = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Ruta a /uploads/... subida desde el panel. Null = sin portada personalizada. */
  image?: string | null;
  /** false = oculta: desaparece del menú y sus productos dejan de verse en la tienda. */
  isVisible: boolean;
};

export const SIZES_ADULT = ["P", "M", "G", "XL", "XXL"];
export const SIZES_KIDS = ["4A", "6A", "8A", "10A", "12A", "14A"];

// ── Ventas ───────────────────────────────────────────────────────────────

export type SaleChannel = "store" | "whatsapp" | "instagram" | "web";

export const SALE_CHANNELS: { value: SaleChannel; label: string }[] = [
  { value: "store", label: "Tienda física" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "web", label: "Web" },
];

export type SaleLine = {
  id: number;
  productId: string;
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
};

export type Sale = {
  id: string;
  channel: SaleChannel;
  staffName?: string | null;
  customerNote?: string | null;
  soldAt: string;
  items: SaleLine[];
};

export const lineTotal = (line: SaleLine) => line.unitPrice * line.quantity;
export const lineProfit = (line: SaleLine) =>
  (line.unitPrice - line.costPrice) * line.quantity;
export const saleTotal = (sale: Sale) =>
  sale.items.reduce((acc, l) => acc + lineTotal(l), 0);
export const saleProfit = (sale: Sale) =>
  sale.items.reduce((acc, l) => acc + lineProfit(l), 0);

export const PATTERNS: { value: Pattern; label: string }[] = [
  { value: "solid", label: "Liso" },
  { value: "stripes", label: "Franjas verticales" },
  { value: "hoops", label: "Franjas horizontales" },
  { value: "halves", label: "Mitades" },
  { value: "sash", label: "Banda diagonal/central" },
];

export const LEAGUES = [
  "LaLiga",
  "Premier League",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Selecciones",
];

// ── Selectores puros ─────────────────────────────────────────────────────
// Todos reciben los datos como argumento: quien los llama decide de dónde
// vienen (JSON en servidor, props ya cargadas en cliente).

export const isOnSale = (p: Product) =>
  typeof p.compareAt === "number" && p.compareAt > p.price;

export const discountPercent = (p: Product) =>
  isOnSale(p) ? Math.round((1 - p.price / p.compareAt!) * 100) : 0;

/** Los productos "ajeno"/"importado" no llevan stock por talla: nunca se marcan agotados. */
export const needsSizeSelection = (p: Product) => p.stockMode === "propio";

export const isSoldOut = (p: Product) =>
  needsSizeSelection(p) &&
  p.sizes.length > 0 &&
  (p.soldOut?.length ?? 0) >= p.sizes.length;

export const getProduct = (products: Product[], slug: string) =>
  products.find((p) => p.slug === slug);

export const getProductById = (products: Product[], id: string) =>
  products.find((p) => p.id === id);

export const getCategory = (categories: Category[], slug: string) =>
  categories.find((c) => c.slug === slug);

export const byCategory = (products: Product[], slug: string) =>
  products.filter((p) => p.category === slug);

export const onSaleProducts = (products: Product[]) =>
  products.filter(isOnSale);

export const newArrivals = (products: Product[]) =>
  products.filter((p) => p.isNew);

export const bestSellers = (products: Product[]) =>
  [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 8);

export const relatedTo = (products: Product[], product: Product, limit = 4) =>
  products
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .slice(0, limit);

/** Búsqueda simple sobre nombre, categoría y etiquetas. */
export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return products
    .map((p) => {
      const haystack = [p.name, p.category, ...p.tags]
        .join(" ")
        .toLowerCase();
      const score = terms.reduce(
        (acc, t) => acc + (haystack.includes(t) ? 1 : 0),
        0,
      );
      return { p, score };
    })
    .filter((r) => r.score === terms.length)
    .sort((a, b) => b.p.reviews - a.p.reviews)
    .map((r) => r.p);
}
