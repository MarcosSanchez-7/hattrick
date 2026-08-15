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

export type NoticeIcon = "truck" | "print" | "return" | "shield";

export type ProductNotice = { icon: NoticeIcon; text: string };

export type Category = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Ruta a /uploads/... subida desde el panel. Null = sin portada personalizada. */
  image?: string | null;
  /** false = oculta: desaparece del menú y sus productos dejan de verse en la tienda. */
  isVisible: boolean;
  /** Slug de la categoría padre. Null = categoría raíz (nivel superior). */
  parentSlug: string | null;
  /** Avisos propios bajo "Añadir al carrito". Null/vacío = usa los del sitio. */
  notices: ProductNotice[] | null;
};

/** Etiqueta estandarizada del catálogo (ej. "Versión Fan"), con su color. */
export type Tag = { name: string; color: string };

/** Dónde aparece el enlace en el footer: franja legal, columna Ayuda o Empresa. */
export type PagePlacement = "legal" | "ayuda" | "empresa";

/** Página de contenido editable (Términos, Envíos, Contacto, etc.). */
export type Page = {
  slug: string;
  title: string;
  body: string;
  placement: PagePlacement;
  sortOrder: number;
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
  /** Primera imagen del producto (resuelta en vivo desde el catálogo actual). */
  imageUrl: string | null;
  /** Detalle del artículo: personalización, parches, etc. */
  note: string | null;
};

/** Solo dígitos, últimos 9 — para matchear teléfonos sin pelear con
 * espacios, guiones o el 0/+595 inicial que cada quien escribe distinto.
 * Compartido entre server (lib/data.ts) y client (SaleForm.tsx). */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-9);
}

export type ShippingMethod = "bolt" | "delivery_propio" | "retiro" | "otro";

export const SHIPPING_METHODS: { value: ShippingMethod; label: string }[] = [
  { value: "bolt", label: "Bolt" },
  { value: "delivery_propio", label: "Delivery propio" },
  { value: "retiro", label: "Retiro en tienda" },
  { value: "otro", label: "Otro" },
];

export type Sale = {
  id: string;
  channel: SaleChannel;
  staffName?: string | null;
  customerNote?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  destinationCity?: string | null;
  shippingMethod?: ShippingMethod | null;
  /** Solo cuando shippingMethod === "otro": aclaración libre (ej. de dónde sale el paquete en un dropshipping). */
  shippingMethodDetail?: string | null;
  /** Cliente vinculado (CRM ligero) — null = venta ocasional/anónima. */
  customerId?: string | null;
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

// ── Importaciones (China) ────────────────────────────────────────────────
// Puro cálculo, sin acceso a datos: se recalcula siempre desde los valores
// crudos guardados (nunca se persiste el resultado), así el preview en vivo
// del formulario y lo que se ve después en la lista son exactamente el
// mismo número.

export type ImportCostInput = {
  costUsd: number;
  exchangeRate: number;
  weightKg: number;
  costPerKg: number;
  taxRate: number;
};

export const importProductCostGs = (i: ImportCostInput) => i.costUsd * i.exchangeRate;
export const importShippingCostGs = (i: ImportCostInput) => i.weightKg * i.costPerKg;
export const importSubtotalGs = (i: ImportCostInput) =>
  importProductCostGs(i) + importShippingCostGs(i);
export const importTaxGs = (i: ImportCostInput) => importSubtotalGs(i) * (i.taxRate / 100);
export const importTotalGs = (i: ImportCostInput) => importSubtotalGs(i) + importTaxGs(i);

export const PATTERNS: { value: Pattern; label: string }[] = [
  { value: "solid", label: "Liso" },
  { value: "stripes", label: "Franjas verticales" },
  { value: "hoops", label: "Franjas horizontales" },
  { value: "halves", label: "Mitades" },
  { value: "sash", label: "Banda diagonal/central" },
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

// ── Árbol de categorías ──────────────────────────────────────────────────
// "categories" es una adjacency list (cada una apunta a su padre por slug).
// Con pocas decenas de filas alcanza con recorrerlo en memoria; todas las
// funciones de acá abajo llevan un `visited` para no colgarse si alguna vez
// se cuela un ciclo por fuera de la app (ej. edición manual en SQL).

export const topLevelCategories = (categories: Category[]) =>
  categories.filter((c) => !c.parentSlug);

export const categoryChildren = (categories: Category[], slug: string) =>
  categories.filter((c) => c.parentSlug === slug);

/** Cadena de ancestros, raíz→padre-directo, sin incluir la propia categoría. */
export function categoryAncestors(
  categories: Category[],
  slug: string,
): Category[] {
  const chain: Category[] = [];
  const visited = new Set<string>([slug]);
  let current = getCategory(categories, slug);
  while (current?.parentSlug && !visited.has(current.parentSlug)) {
    const parent = getCategory(categories, current.parentSlug);
    if (!parent) break;
    visited.add(parent.slug);
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/**
 * Visible para el cliente solo si ella misma Y todos sus ancestros están
 * visibles — ocultar "NBA" también saca a "Lakers" de la tienda, aunque
 * "Lakers" siga marcada como visible individualmente. Requiere la lista
 * COMPLETA de categorías (incluidas las ocultas) para recorrer bien la
 * cadena de ancestros; con una lista ya filtrada, un ancestro oculto
 * desaparecería del árbol y rompería el cálculo de la ruta.
 */
export function isCategoryVisible(categories: Category[], slug: string): boolean {
  const self = getCategory(categories, slug);
  if (!self || !self.isVisible) return false;
  return categoryAncestors(categories, slug).every((a) => a.isVisible);
}

/** Ancestros + la propia categoría, raíz→hoja. */
export function categoryPath(categories: Category[], slug: string): Category[] {
  const self = getCategory(categories, slug);
  if (!self) return [];
  return [...categoryAncestors(categories, slug), self];
}

/** Igual que categoryPath pero solo los slugs, para armar URLs anidadas. */
export const categorySlugPath = (categories: Category[], slug: string) =>
  categoryPath(categories, slug).map((c) => c.slug);

/**
 * Avisos a mostrar en la ficha de un producto de esta categoría: los suyos
 * propios si los definió, si no los del ancestro más cercano que sí tenga,
 * y si ninguno definió nada, los avisos por defecto del sitio.
 */
export function resolveCategoryNotices(
  categories: Category[],
  slug: string,
  siteDefault: ProductNotice[],
): ProductNotice[] {
  const chain = categoryPath(categories, slug);
  for (let i = chain.length - 1; i >= 0; i--) {
    const own = chain[i].notices;
    if (own && own.length > 0) return own;
  }
  return siteDefault;
}

/** Todos los descendientes (hijos, nietos, ...), sin incluir la propia categoría. */
export function descendantSlugs(
  categories: Category[],
  slug: string,
): Set<string> {
  const result = new Set<string>();
  const stack = [slug];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const child of categoryChildren(categories, current)) {
      if (result.has(child.slug)) continue;
      result.add(child.slug);
      stack.push(child.slug);
    }
  }
  return result;
}

/** Productos de una categoría y de todas sus subcategorías. */
export function byCategoryTree(
  products: Product[],
  categories: Category[],
  slug: string,
): Product[] {
  const slugs = new Set([slug, ...descendantSlugs(categories, slug)]);
  return products.filter((p) => slugs.has(p.category));
}

/**
 * Orden depth-first (padre seguido de sus hijos, recursivamente) con la
 * profundidad de cada una, para indentar en tablas/selects del admin.
 */
export function orderCategoriesTree(
  categories: Category[],
): { category: Category; depth: number }[] {
  const result: { category: Category; depth: number }[] = [];
  const visit = (parentSlug: string | null, depth: number) => {
    for (const c of categories.filter((c) => (c.parentSlug ?? null) === parentSlug)) {
      result.push({ category: c, depth });
      visit(c.slug, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

/** True si asignarle `newParentSlug` a `slug` formaría un ciclo (o es auto-referencia). */
export function wouldCreateCycle(
  categories: Category[],
  slug: string,
  newParentSlug: string | null,
): boolean {
  if (!newParentSlug) return false;
  if (newParentSlug === slug) return true;
  return categoryAncestors(categories, newParentSlug).some((c) => c.slug === slug);
}

export const onSaleProducts = (products: Product[]) =>
  products.filter(isOnSale);

export const newArrivals = (products: Product[]) =>
  products.filter((p) => p.isNew);

export const bestSellers = (products: Product[]) =>
  [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 8);

/**
 * Primero por misma categoría (más relevante: mismo equipo/torneo); si no
 * alcanza el `limit`, completa con productos que compartan al menos una
 * etiqueta, sin repetir ninguno ya elegido.
 */
export const relatedTo = (products: Product[], product: Product, limit = 4) => {
  const sameCategory = products.filter(
    (p) => p.slug !== product.slug && p.category === product.category,
  );
  if (sameCategory.length >= limit || product.tags.length === 0) {
    return sameCategory.slice(0, limit);
  }

  const seen = new Set(sameCategory.map((p) => p.slug));
  const byTag = products.filter(
    (p) =>
      p.slug !== product.slug &&
      !seen.has(p.slug) &&
      p.tags.some((t) => product.tags.includes(t)),
  );

  return [...sameCategory, ...byTag].slice(0, limit);
};

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
