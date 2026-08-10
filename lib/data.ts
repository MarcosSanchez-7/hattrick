import "server-only";
import { cache } from "react";
import { randomUUID } from "crypto";
import type {
  Category,
  Product,
  ProductNotice,
  ProductVariant,
  Sale,
  SaleChannel,
  SaleLine,
  StockMode,
  Tag,
} from "@/lib/catalog";
import { descendantSlugs, wouldCreateCycle } from "@/lib/catalog";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { SiteSettingsKey } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Capa de datos sobre Supabase (Postgres). El resto de la app (páginas del
 * store y del panel, rutas /api/admin/*) solo conoce estas funciones, nunca
 * el cliente de Supabase directamente — así el motor de almacenamiento se
 * puede cambiar sin tocar nada fuera de este fichero.
 */

export class DataError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function fail(message: string, status = 500): never {
  throw new DataError(message, status);
}

// ── Filas de Postgres <-> tipos de la app ──────────────────────────────────

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number | string;
  compare_at: number | string | null;
  cost_price: number | string | null;
  is_new: boolean;
  rating: number | string;
  reviews: number;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  pattern: Product["pattern"];
  description: string;
  tags: string[] | null;
  images: string[] | null;
  stock_mode: StockMode;
  is_visible: boolean;
};

type VariantRow = {
  id: string;
  product_id: string;
  size: string;
  stock_on_hand: number;
};

type CategoryRow = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string | null;
  is_visible: boolean;
  parent_slug: string | null;
  notices: ProductNotice[] | null;
};

function rowToProduct(row: ProductRow, variantRows: VariantRow[]): Product {
  const isPropio = row.stock_mode === "propio";
  const variants: ProductVariant[] = variantRows.map((v) => ({
    id: v.id,
    size: v.size,
    stock: v.stock_on_hand,
  }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    compareAt: row.compare_at != null ? Number(row.compare_at) : null,
    costPrice: row.cost_price != null ? Number(row.cost_price) : null,
    isVisible: row.is_visible,
    isNew: row.is_new,
    rating: Number(row.rating),
    reviews: row.reviews,
    stockMode: row.stock_mode,
    variants: isPropio ? variants : undefined,
    // Derivadas de product_variants: la cantidad real es la única fuente de
    // verdad para saber qué tallas hay y cuáles están agotadas.
    sizes: isPropio ? variants.map((v) => v.size) : [],
    soldOut: isPropio ? variants.filter((v) => v.stock <= 0).map((v) => v.size) : [],
    colors: {
      primary: row.color_primary,
      secondary: row.color_secondary,
      accent: row.color_accent,
    },
    pattern: row.pattern,
    description: row.description,
    tags: row.tags ?? [],
    images: row.images ?? [],
  };
}

function rowToCategory(row: CategoryRow): Category {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    image: row.image ?? null,
    isVisible: row.is_visible,
    parentSlug: row.parent_slug ?? null,
    notices: row.notices ?? null,
  };
}

type TagRow = { name: string; color: string };

function rowToTag(row: TagRow): Tag {
  return { name: row.name, color: row.color };
}

async function fetchVariantsByProduct(
  productIds: string[],
): Promise<Map<string, VariantRow[]>> {
  const map = new Map<string, VariantRow[]>();
  if (productIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .select("*")
    .in("product_id", productIds);
  if (error) fail(`No se pudieron cargar las tallas y el stock: ${error.message}`);

  for (const row of data as VariantRow[]) {
    const list = map.get(row.product_id) ?? [];
    list.push(row);
    map.set(row.product_id, list);
  }
  return map;
}

async function fetchProductWithVariants(id: string): Promise<Product> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) fail(`No se pudo releer el producto: ${error.message}`);

  const row = data as ProductRow;
  const variantMap = await fetchVariantsByProduct(
    row.stock_mode === "propio" ? [row.id] : [],
  );
  return rowToProduct(row, variantMap.get(row.id) ?? []);
}

// ── Lecturas ────────────────────────────────────────────────────────────

/**
 * Por defecto solo trae lo visible al público: excluye productos ocultos y,
 * en cascada, los productos cuya categoría está oculta (aunque el producto
 * en sí no lo esté) — así ocultar una categoría "apaga" toda la tienda para
 * esos productos, no solo el menú. El panel de admin pide includeHidden:true
 * para poder seguir viendo y editando todo.
 */
export async function getAllProducts(
  opts: { includeHidden?: boolean } = {},
): Promise<Product[]> {
  let query = supabaseAdmin.from("products").select("*").order("created_at", {
    ascending: true,
  });
  if (!opts.includeHidden) query = query.eq("is_visible", true);

  const { data, error } = await query;
  if (error) fail(`No se pudieron cargar los productos: ${error.message}`);

  let rows = data as ProductRow[];

  if (!opts.includeHidden) {
    // Ocultar una categoría oculta también a sus subcategorías (y por lo
    // tanto a los productos de esas subcategorías), aunque cada una siga
    // marcada como visible individualmente.
    const allCategories = await getAllCategories({ includeHidden: true });
    const hiddenSlugs = new Set<string>();
    for (const c of allCategories.filter((c) => !c.isVisible)) {
      hiddenSlugs.add(c.slug);
      for (const d of descendantSlugs(allCategories, c.slug)) hiddenSlugs.add(d);
    }
    rows = rows.filter((r) => !hiddenSlugs.has(r.category));
  }

  const propioIds = rows.filter((r) => r.stock_mode === "propio").map((r) => r.id);
  const variantMap = await fetchVariantsByProduct(propioIds);

  return rows.map((row) => rowToProduct(row, variantMap.get(row.id) ?? []));
}

export async function getAllCategories(
  opts: { includeHidden?: boolean } = {},
): Promise<Category[]> {
  let query = supabaseAdmin.from("categories").select("*").order("created_at", {
    ascending: true,
  });
  if (!opts.includeHidden) query = query.eq("is_visible", true);

  const { data, error } = await query;
  if (error) fail(`No se pudieron cargar las categorías: ${error.message}`);
  return (data as CategoryRow[]).map(rowToCategory);
}

export async function setProductVisibility(
  id: string,
  isVisible: boolean,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .update({ is_visible: isVisible })
    .eq("id", id)
    .select("id");
  if (error) fail(`No se pudo cambiar la visibilidad del producto: ${error.message}`);
  if (!data || data.length === 0) throw new DataError("Producto no encontrado.", 404);
}

export async function setCategoryVisibility(
  slug: string,
  isVisible: boolean,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .update({ is_visible: isVisible })
    .eq("slug", slug)
    .select("slug");
  if (error) {
    fail(`No se pudo cambiar la visibilidad de la categoría: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new DataError("Categoría no encontrada.", 404);
  }
}

// ── Stock (product_variants + inventory_movements) ────────────────────────

async function insertMovement(
  variantId: string,
  movementType: "restock" | "correction",
  quantityDelta: number,
  note: string,
) {
  const { error } = await supabaseAdmin.from("inventory_movements").insert({
    variant_id: variantId,
    movement_type: movementType,
    quantity_delta: quantityDelta,
    note,
  });
  if (error) {
    if (error.message.includes("stock_on_hand"))  {
      fail("No hay suficiente stock para aplicar ese cambio.", 400);
    }
    fail(`No se pudo registrar el movimiento de stock: ${error.message}`);
  }
}

/**
 * Deja el stock de cada talla en la cantidad indicada (valor absoluto, no un
 * delta): crea las tallas que falten, ajusta las que cambiaron de cantidad
 * (vía un movimiento 'correction', nunca escribiendo stock_on_hand a mano) y
 * lleva a 0 las tallas que ya no están seleccionadas — sin borrar el
 * histórico de esa talla.
 */
async function syncProductVariants(
  productId: string,
  quantities: Record<string, number>,
): Promise<void> {
  const { data: existing, error } = await supabaseAdmin
    .from("product_variants")
    .select("*")
    .eq("product_id", productId);
  if (error) fail(`No se pudo leer el stock actual: ${error.message}`);

  const existingBySize = new Map(
    (existing as VariantRow[]).map((v) => [v.size, v] as const),
  );

  for (const [size, rawQty] of Object.entries(quantities)) {
    const qty = Math.max(0, Math.round(rawQty));
    const current = existingBySize.get(size);

    if (!current) {
      const variantId = `pv-${randomUUID().slice(0, 8)}`;
      const { error: insertError } = await supabaseAdmin
        .from("product_variants")
        .insert({ id: variantId, product_id: productId, size });
      if (insertError) {
        fail(`No se pudo crear la talla "${size}": ${insertError.message}`);
      }
      if (qty > 0) {
        await insertMovement(variantId, "restock", qty, "Alta inicial desde el panel");
      }
    } else if (qty !== current.stock_on_hand) {
      await insertMovement(
        current.id,
        "correction",
        qty - current.stock_on_hand,
        "Ajuste de cantidad desde el panel de administración",
      );
    }
  }

  for (const [size, variant] of existingBySize) {
    if (!(size in quantities) && variant.stock_on_hand !== 0) {
      await insertMovement(
        variant.id,
        "correction",
        -variant.stock_on_hand,
        "Talla retirada desde el panel de administración",
      );
    }
  }
}

// ── Productos ────────────────────────────────────────────────────────────

export type ProductInput = Omit<
  Product,
  "id" | "slug" | "variants" | "sizes" | "soldOut"
> & {
  slug?: string;
  /** Cantidad por talla. Sólo se usa (y se exige) cuando stockMode === "propio". */
  variantQuantities?: Record<string, number>;
};

function assertValidProduct(input: ProductInput) {
  if (!input.name?.trim()) throw new DataError("El nombre es obligatorio.");
  if (!input.category?.trim()) throw new DataError("La categoría es obligatoria.");
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new DataError("El precio debe ser un número mayor que 0.");
  }
  if (input.compareAt != null && input.compareAt <= input.price) {
    throw new DataError(
      "El precio anterior debe ser mayor que el precio actual.",
    );
  }
  if (!["propio", "ajeno", "importado"].includes(input.stockMode)) {
    throw new DataError("Selecciona un tipo de stock válido.");
  }
  if (input.stockMode === "propio") {
    const quantities = input.variantQuantities ?? {};
    if (Object.keys(quantities).length === 0) {
      throw new DataError("Selecciona al menos una talla y su cantidad.");
    }
  }
  if (!input.description?.trim()) {
    throw new DataError("La descripción es obligatoria.");
  }
}

function productToRow(input: ProductInput) {
  return {
    name: input.name,
    category: input.category,
    price: input.price,
    compare_at: input.compareAt ?? null,
    cost_price: input.costPrice ?? null,
    is_visible: input.isVisible ?? true,
    is_new: Boolean(input.isNew),
    rating: Number.isFinite(input.rating) ? input.rating : 5,
    reviews: Number.isFinite(input.reviews) ? input.reviews : 0,
    color_primary: input.colors.primary,
    color_secondary: input.colors.secondary,
    color_accent: input.colors.accent,
    pattern: input.pattern,
    description: input.description,
    tags: input.tags ?? [],
    images: input.images ?? [],
    stock_mode: input.stockMode,
  };
}

export async function createProduct(input: ProductInput): Promise<Product> {
  assertValidProduct(input);

  const { data: existing, error: readError } = await supabaseAdmin
    .from("products")
    .select("slug");
  if (readError) fail(`No se pudo comprobar el slug: ${readError.message}`);
  const taken = new Set((existing as { slug: string }[]).map((p) => p.slug));
  const slug = input.slug?.trim()
    ? uniqueSlug(input.slug, taken)
    : uniqueSlug(input.name, taken);

  const id = `p-${randomUUID().slice(0, 8)}`;
  const { error } = await supabaseAdmin
    .from("products")
    .insert({ id, slug, ...productToRow(input) });

  if (error) {
    if (error.code === "23503") {
      fail("La categoría seleccionada no existe.", 400);
    }
    fail(`No se pudo crear el producto: ${error.message}`);
  }

  if (input.stockMode === "propio") {
    await syncProductVariants(id, input.variantQuantities ?? {});
  }

  return fetchProductWithVariants(id);
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<Product> {
  assertValidProduct(input);

  const { data: existing, error: readError } = await supabaseAdmin
    .from("products")
    .select("id, slug");
  if (readError) fail(`No se pudo comprobar el slug: ${readError.message}`);
  const rows = existing as { id: string; slug: string }[];
  if (!rows.some((p) => p.id === id)) {
    throw new DataError("Producto no encontrado.", 404);
  }
  const taken = new Set(rows.filter((p) => p.id !== id).map((p) => p.slug));
  const slug = input.slug?.trim()
    ? uniqueSlug(input.slug, taken)
    : rows.find((p) => p.id === id)!.slug;

  const { error } = await supabaseAdmin
    .from("products")
    .update({ slug, ...productToRow(input) })
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      fail("La categoría seleccionada no existe.", 400);
    }
    fail(`No se pudo actualizar el producto: ${error.message}`);
  }

  // Siempre se llama (incluso fuera de "propio") para dejar en 0 cualquier
  // talla que hubiera quedado de un cambio de tipo de stock anterior.
  await syncProductVariants(
    id,
    input.stockMode === "propio" ? input.variantQuantities ?? {} : {},
  );

  return fetchProductWithVariants(id);
}

export async function deleteProduct(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    fail(`No se pudo eliminar el producto: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new DataError("Producto no encontrado.", 404);
  }
}

// ── Categorías ───────────────────────────────────────────────────────────

export type CategoryInput = Omit<Category, "slug"> & { slug?: string };

function assertValidCategory(input: CategoryInput) {
  if (!input.name?.trim()) throw new DataError("El nombre es obligatorio.");
  if (!input.tagline?.trim()) throw new DataError("El eslogan es obligatorio.");
  if (!input.description?.trim()) {
    throw new DataError("La descripción es obligatoria.");
  }
}

export async function createCategory(
  input: CategoryInput,
): Promise<Category> {
  assertValidCategory(input);

  const categories = await getAllCategories({ includeHidden: true });
  const taken = new Set(categories.map((c) => c.slug));
  const slug = input.slug?.trim()
    ? uniqueSlug(input.slug, taken)
    : uniqueSlug(input.name, taken);

  const parentSlug = input.parentSlug ?? null;
  if (parentSlug && !categories.some((c) => c.slug === parentSlug)) {
    throw new DataError("La categoría padre seleccionada no existe.");
  }
  if (wouldCreateCycle(categories, slug, parentSlug)) {
    throw new DataError(
      "Esa categoría padre generaría un ciclo: no puede ser ni la propia categoría ni una de sus subcategorías.",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({
      slug,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      image: input.image ?? null,
      is_visible: input.isVisible ?? true,
      parent_slug: parentSlug,
      notices: input.notices?.length ? input.notices : null,
    })
    .select()
    .single();

  if (error) fail(`No se pudo crear la categoría: ${error.message}`);
  return rowToCategory(data as CategoryRow);
}

export async function updateCategory(
  slug: string,
  input: CategoryInput,
): Promise<Category> {
  assertValidCategory(input);

  const categories = await getAllCategories({ includeHidden: true });
  if (!categories.some((c) => c.slug === slug)) {
    throw new DataError("Categoría no encontrada.", 404);
  }

  const parentSlug = input.parentSlug ?? null;
  if (parentSlug && !categories.some((c) => c.slug === parentSlug)) {
    throw new DataError("La categoría padre seleccionada no existe.");
  }
  if (wouldCreateCycle(categories, slug, parentSlug)) {
    throw new DataError(
      "Esa categoría padre generaría un ciclo: no puede ser ni la propia categoría ni una de sus subcategorías.",
    );
  }

  // El slug es la clave usada por los productos: no se permite cambiarlo.
  const { data, error } = await supabaseAdmin
    .from("categories")
    .update({
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      image: input.image ?? null,
      is_visible: input.isVisible ?? true,
      parent_slug: parentSlug,
      notices: input.notices?.length ? input.notices : null,
    })
    .eq("slug", slug)
    .select()
    .single();

  if (error) fail(`No se pudo actualizar la categoría: ${error.message}`);
  if (!data) throw new DataError("Categoría no encontrada.", 404);
  return rowToCategory(data as CategoryRow);
}

export async function deleteCategory(slug: string): Promise<void> {
  const { count: childCount, error: childError } = await supabaseAdmin
    .from("categories")
    .select("slug", { count: "exact", head: true })
    .eq("parent_slug", slug);
  if (childError) {
    fail(`No se pudo comprobar las subcategorías: ${childError.message}`);
  }
  if (childCount && childCount > 0) {
    throw new DataError(
      "No puedes eliminar una categoría con subcategorías. Elimina o reasigna esas subcategorías primero.",
    );
  }

  const { count, error: countError } = await supabaseAdmin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category", slug);
  if (countError) fail(`No se pudo comprobar el uso de la categoría: ${countError.message}`);
  if (count && count > 0) {
    throw new DataError(
      "No puedes eliminar una categoría con productos asociados. Reasigna o elimina esos productos primero.",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .delete()
    .eq("slug", slug)
    .select("slug");
  if (error) fail(`No se pudo eliminar la categoría: ${error.message}`);
  if (!data || data.length === 0) {
    throw new DataError("Categoría no encontrada.", 404);
  }
}

// ── Etiquetas ────────────────────────────────────────────────────────────
// Catálogo de etiquetas estandarizadas con color. products.tags sigue siendo
// texto libre: acá solo se guarda qué color le corresponde a cada nombre.

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function assertValidTag(name: string, color: string) {
  if (!name?.trim()) throw new DataError("El nombre de la etiqueta es obligatorio.");
  if (!HEX_COLOR.test(color)) {
    throw new DataError("El color debe ser un hexadecimal válido (ej. #2f2f2f).");
  }
}

// cache(): ProductCard (Server Component) llama esto directamente para
// pintar el color de cada etiqueta sin tener que pasarlo como prop desde
// cada página que renderiza tarjetas — React lo memoiza por request, así
// que solo pega a Supabase una vez aunque se rendericen muchas tarjetas.
export const getAllTags = cache(async (): Promise<Tag[]> => {
  const { data, error } = await supabaseAdmin
    .from("tags")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) fail(`No se pudieron cargar las etiquetas: ${error.message}`);
  return (data as TagRow[]).map(rowToTag);
});

export async function createTag(name: string, color: string): Promise<Tag> {
  const trimmed = name.trim();
  assertValidTag(trimmed, color);

  const { data, error } = await supabaseAdmin
    .from("tags")
    .insert({ name: trimmed, color })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new DataError("Ya existe una etiqueta con ese nombre.");
    }
    fail(`No se pudo crear la etiqueta: ${error.message}`);
  }
  return rowToTag(data as TagRow);
}

export async function updateTagColor(name: string, color: string): Promise<Tag> {
  assertValidTag(name, color);

  const { data, error } = await supabaseAdmin
    .from("tags")
    .update({ color })
    .eq("name", name)
    .select()
    .single();

  if (error) fail(`No se pudo actualizar la etiqueta: ${error.message}`);
  if (!data) throw new DataError("Etiqueta no encontrada.", 404);
  return rowToTag(data as TagRow);
}

export async function deleteTag(name: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("tags")
    .delete()
    .eq("name", name)
    .select("name");
  if (error) fail(`No se pudo eliminar la etiqueta: ${error.message}`);
  if (!data || data.length === 0) {
    throw new DataError("Etiqueta no encontrada.", 404);
  }
}

// ── Ventas ───────────────────────────────────────────────────────────────

type SaleItemRow = {
  id: number;
  quantity: number;
  unit_price: number | string;
  cost_price: number | string;
  product_variants: {
    size: string;
    product_id: string;
    products: { name: string } | null;
  } | null;
};

type SaleRow = {
  id: string;
  channel: SaleChannel;
  staff_name: string | null;
  customer_note: string | null;
  sold_at: string;
  sale_items: SaleItemRow[];
};

const SALE_SELECT =
  "id, channel, staff_name, customer_note, sold_at, sale_items(id, quantity, unit_price, cost_price, product_variants(size, product_id, products(name)))";

function rowToSale(row: SaleRow): Sale {
  const items: SaleLine[] = (row.sale_items ?? []).map((si) => ({
    id: si.id,
    productId: si.product_variants?.product_id ?? "",
    name: si.product_variants?.products?.name ?? "—",
    size: si.product_variants?.size ?? "—",
    quantity: si.quantity,
    unitPrice: Number(si.unit_price),
    costPrice: Number(si.cost_price),
  }));

  return {
    id: row.id,
    channel: row.channel,
    staffName: row.staff_name,
    customerNote: row.customer_note,
    soldAt: row.sold_at,
    items,
  };
}

export async function getSales(range?: {
  from?: string;
  to?: string;
}): Promise<Sale[]> {
  let query = supabaseAdmin
    .from("sales")
    .select(SALE_SELECT)
    .order("sold_at", { ascending: false });

  if (range?.from) query = query.gte("sold_at", range.from);
  if (range?.to) query = query.lte("sold_at", range.to);

  const { data, error } = await query;
  if (error) fail(`No se pudieron cargar las ventas: ${error.message}`);
  return (data as unknown as SaleRow[]).map(rowToSale);
}

export type SaleItemInput = {
  variantId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
};

export type SaleInput = {
  channel: SaleChannel;
  staffName?: string | null;
  customerNote?: string | null;
  items: SaleItemInput[];
};

function assertValidSale(input: SaleInput) {
  if (!input.items || input.items.length === 0) {
    throw new DataError("Agrega al menos un artículo a la venta.");
  }
  for (const item of input.items) {
    if (!item.variantId) throw new DataError("Falta seleccionar una talla.");
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new DataError("La cantidad debe ser mayor que 0.");
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new DataError("El precio de venta no es válido.");
    }
    if (!Number.isFinite(item.costPrice) || item.costPrice < 0) {
      throw new DataError("El precio de costo no es válido.");
    }
  }
}

export async function recordSale(input: SaleInput): Promise<string> {
  assertValidSale(input);

  const id = `s-${randomUUID().slice(0, 8)}`;
  const { error } = await supabaseAdmin.rpc("record_sale", {
    p_id: id,
    p_channel: input.channel,
    p_staff_name: input.staffName ?? null,
    p_customer_note: input.customerNote ?? null,
    p_items: input.items.map((i) => ({
      variant_id: i.variantId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      cost_price: i.costPrice,
    })),
  });

  if (error) {
    if (error.message.includes("stock_on_hand")) {
      fail(
        "No hay stock suficiente para completar la venta con esas cantidades.",
        400,
      );
    }
    fail(`No se pudo registrar la venta: ${error.message}`);
  }
  return id;
}

// ── Configuración general del sitio ────────────────────────────────────────

/**
 * Nunca debe tumbar la tienda: si la tabla no existe todavía (antes de correr
 * la migración) o hay cualquier error, se usa el valor por defecto en
 * silencio en vez de romper la página.
 */
export async function getSetting<T>(key: SiteSettingsKey, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data ? ({ ...fallback, ...(data.value as object) } as T) : fallback;
  } catch (err) {
    console.error(`No se pudo cargar la configuración "${key}", usando valores por defecto:`, err);
    return fallback;
  }
}

export async function updateSetting(
  key: SiteSettingsKey,
  value: unknown,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) fail(`No se pudo guardar la configuración "${key}": ${error.message}`);
}

export { slugify };
