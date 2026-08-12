import "server-only";
import { cache } from "react";
import { randomUUID } from "crypto";
import type {
  Category,
  Page,
  PagePlacement,
  Product,
  ProductNotice,
  ProductVariant,
  Sale,
  SaleChannel,
  SaleLine,
  StockMode,
  Tag,
} from "@/lib/catalog";
import { descendantSlugs, SIZES_ADULT, wouldCreateCycle } from "@/lib/catalog";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { SiteSettingsKey } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hashPassword, verifyPassword, type AdminRole } from "@/lib/admin-auth";

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

/** P/M/G/XL/XXL primero, en ese orden; cualquier talla no reconocida va al final. */
function sizeRank(size: string): number {
  const i = SIZES_ADULT.indexOf(size);
  return i === -1 ? SIZES_ADULT.length : i;
}

function rowToProduct(row: ProductRow, variantRows: VariantRow[]): Product {
  const isPropio = row.stock_mode === "propio";
  const orderedVariantRows = [...variantRows].sort(
    (a, b) => sizeRank(a.size) - sizeRank(b.size),
  );
  const variants: ProductVariant[] = orderedVariantRows.map((v) => ({
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
  createdBy?: string | null,
) {
  const { error } = await supabaseAdmin.from("inventory_movements").insert({
    variant_id: variantId,
    movement_type: movementType,
    quantity_delta: quantityDelta,
    note,
    created_by: createdBy ?? null,
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

export type StockAdjustmentInput = {
  variantId: string;
  /** restock: suma `quantity` al stock actual. correction: fija `quantity` como el nuevo valor absoluto. */
  mode: "restock" | "correction";
  quantity: number;
  note?: string | null;
  adminName?: string | null;
};

export async function registerStockAdjustment(
  input: StockAdjustmentInput,
): Promise<void> {
  const quantity = Math.round(input.quantity);

  const { data: variant, error } = await supabaseAdmin
    .from("product_variants")
    .select("id, stock_on_hand")
    .eq("id", input.variantId)
    .maybeSingle();
  if (error) fail(`No se pudo leer la talla: ${error.message}`);
  if (!variant) throw new DataError("Talla no encontrada.", 404);

  let delta: number;
  let defaultNote: string;
  if (input.mode === "restock") {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new DataError("La cantidad a reponer debe ser mayor que 0.");
    }
    delta = quantity;
    defaultNote = "Reposición manual desde Inventario";
  } else {
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new DataError("La cantidad no puede ser negativa.");
    }
    delta = quantity - (variant as VariantRow).stock_on_hand;
    defaultNote = "Corrección manual desde Inventario";
    if (delta === 0) return;
  }

  await insertMovement(
    input.variantId,
    input.mode,
    delta,
    input.note?.trim() || defaultNote,
    input.adminName ?? null,
  );
}

type MovementRow = {
  id: number;
  movement_type: string;
  quantity_delta: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
  product_variants: {
    size: string;
    product_id: string;
    products: { name: string } | null;
  } | null;
};

export type InventoryMovement = {
  id: number;
  productId: string;
  productName: string;
  size: string;
  movementType: string;
  quantityDelta: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

const MOVEMENT_SELECT =
  "id, movement_type, quantity_delta, note, created_by, created_at, product_variants(size, product_id, products(name))";

export async function getInventoryMovements(
  range?: { from?: string; to?: string },
  limit = 200,
): Promise<InventoryMovement[]> {
  let query = supabaseAdmin
    .from("inventory_movements")
    .select(MOVEMENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (range?.from) query = query.gte("created_at", range.from);
  if (range?.to) query = query.lte("created_at", range.to);

  const { data, error } = await query;
  if (error) fail(`No se pudieron cargar los movimientos de stock: ${error.message}`);

  return (data as unknown as MovementRow[]).map((row) => ({
    id: row.id,
    productId: row.product_variants?.product_id ?? "",
    productName: row.product_variants?.products?.name ?? "—",
    size: row.product_variants?.size ?? "—",
    movementType: row.movement_type,
    quantityDelta: row.quantity_delta,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
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

// ── Páginas de contenido (Términos, Envíos, Contacto, etc.) ────────────────

type PageRow = {
  slug: string;
  title: string;
  body: string;
  placement: PagePlacement;
  sort_order: number;
};

function rowToPage(row: PageRow): Page {
  return {
    slug: row.slug,
    title: row.title,
    body: row.body,
    placement: row.placement,
    sortOrder: row.sort_order,
  };
}

// cache(): tanto el layout (para el footer) como /pagina/[slug] la piden en
// el mismo request; React la memoiza para no pegarle dos veces a Supabase.
export const getAllPages = cache(async (): Promise<Page[]> => {
  const { data, error } = await supabaseAdmin
    .from("pages")
    .select("*")
    .order("placement", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) fail(`No se pudieron cargar las páginas: ${error.message}`);
  return (data as PageRow[]).map(rowToPage);
});

export type PageInput = Omit<Page, "slug" | "sortOrder"> & {
  slug?: string;
  sortOrder?: number;
};

function assertValidPage(input: PageInput) {
  if (!input.title?.trim()) throw new DataError("El título es obligatorio.");
  if (!input.body?.trim()) throw new DataError("El contenido es obligatorio.");
  if (!["legal", "ayuda", "empresa"].includes(input.placement)) {
    throw new DataError("Selecciona dónde debe aparecer la página.");
  }
}

export async function createPage(input: PageInput): Promise<Page> {
  assertValidPage(input);

  const { data: existing, error: readError } = await supabaseAdmin
    .from("pages")
    .select("slug");
  if (readError) fail(`No se pudo comprobar el slug: ${readError.message}`);
  const taken = new Set((existing as { slug: string }[]).map((p) => p.slug));
  const slug = input.slug?.trim()
    ? uniqueSlug(input.slug, taken)
    : uniqueSlug(input.title, taken);

  const { data, error } = await supabaseAdmin
    .from("pages")
    .insert({
      slug,
      title: input.title,
      body: input.body,
      placement: input.placement,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) fail(`No se pudo crear la página: ${error.message}`);
  return rowToPage(data as PageRow);
}

export async function updatePage(slug: string, input: PageInput): Promise<Page> {
  assertValidPage(input);

  // El slug es la URL pública (/pagina/<slug>): no se permite cambiarlo.
  const { data, error } = await supabaseAdmin
    .from("pages")
    .update({
      title: input.title,
      body: input.body,
      placement: input.placement,
      sort_order: input.sortOrder ?? 0,
    })
    .eq("slug", slug)
    .select()
    .single();

  if (error) fail(`No se pudo actualizar la página: ${error.message}`);
  if (!data) throw new DataError("Página no encontrada.", 404);
  return rowToPage(data as PageRow);
}

export async function deletePage(slug: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("pages")
    .delete()
    .eq("slug", slug)
    .select("slug");
  if (error) fail(`No se pudo eliminar la página: ${error.message}`);
  if (!data || data.length === 0) {
    throw new DataError("Página no encontrada.", 404);
  }
}

// ── Usuarios del panel de administración ───────────────────────────────

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  created_at: string;
};

/** Nunca incluye password_hash — eso solo lo maneja verifyAdminCredentials. */
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt: string;
};

function rowToAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

export async function getAdminUserCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("admin_users")
    .select("id", { count: "exact", head: true });
  if (error) fail(`No se pudo comprobar los usuarios del panel: ${error.message}`);
  return count ?? 0;
}

export async function getAllAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: true });
  if (error) fail(`No se pudieron cargar los usuarios del panel: ${error.message}`);
  return (data as AdminUserRow[]).map(rowToAdminUser);
}

export async function getAdminUserById(id: string): Promise<AdminUser | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, name, email, role, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(`No se pudo cargar el usuario: ${error.message}`);
  return data ? rowToAdminUser(data as AdminUserRow) : null;
}

/** Única función que toca password_hash — solo la usa el login. */
export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<AdminUser | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) fail(`No se pudo verificar las credenciales: ${error.message}`);
  if (!data) return null;
  const row = data as AdminUserRow;
  if (!verifyPassword(password, row.password_hash)) return null;
  return rowToAdminUser(row);
}

async function countSuperadmins(excludingId?: string): Promise<number> {
  let query = supabaseAdmin
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "superadmin");
  if (excludingId) query = query.neq("id", excludingId);
  const { count, error } = await query;
  if (error) fail(`No se pudo comprobar los superadmins: ${error.message}`);
  return count ?? 0;
}

export type AdminUserInput = {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
};

export async function createAdminUser(input: AdminUserInput): Promise<AdminUser> {
  if (!input.name?.trim()) throw new DataError("El nombre es obligatorio.");
  if (!input.email?.trim() || !input.email.includes("@")) {
    throw new DataError("Ingresa un correo válido.");
  }
  if (!["superadmin", "editor", "viewer"].includes(input.role)) {
    throw new DataError("Selecciona un rol válido.");
  }
  if (!input.password || input.password.length < 8) {
    throw new DataError("La contraseña debe tener al menos 8 caracteres.");
  }

  const id = `admin-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .insert({
      id,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password_hash: hashPassword(input.password),
      role: input.role,
    })
    .select("id, name, email, role, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new DataError("Ya existe un usuario con ese correo.");
    }
    fail(`No se pudo crear el usuario: ${error.message}`);
  }
  return rowToAdminUser(data as AdminUserRow);
}

export type AdminUserUpdateInput = {
  name: string;
  role: AdminRole;
  /** Vacío o ausente = no cambiar la contraseña actual. */
  password?: string;
};

export async function updateAdminUser(
  id: string,
  input: AdminUserUpdateInput,
): Promise<AdminUser> {
  if (!input.name?.trim()) throw new DataError("El nombre es obligatorio.");
  if (!["superadmin", "editor", "viewer"].includes(input.role)) {
    throw new DataError("Selecciona un rol válido.");
  }
  if (input.password && input.password.length < 8) {
    throw new DataError("La contraseña debe tener al menos 8 caracteres.");
  }

  const current = await getAdminUserById(id);
  if (!current) throw new DataError("Usuario no encontrado.", 404);

  if (current.role === "superadmin" && input.role !== "superadmin") {
    const remaining = await countSuperadmins(id);
    if (remaining === 0) {
      throw new DataError(
        "No puedes quitarle el rol de superadmin al único que queda.",
      );
    }
  }

  const patch: Record<string, unknown> = {
    name: input.name.trim(),
    role: input.role,
  };
  if (input.password) patch.password_hash = hashPassword(input.password);

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .update(patch)
    .eq("id", id)
    .select("id, name, email, role, created_at")
    .single();

  if (error) fail(`No se pudo actualizar el usuario: ${error.message}`);
  if (!data) throw new DataError("Usuario no encontrado.", 404);
  return rowToAdminUser(data as AdminUserRow);
}

export async function deleteAdminUser(id: string): Promise<void> {
  const current = await getAdminUserById(id);
  if (!current) throw new DataError("Usuario no encontrado.", 404);

  if (current.role === "superadmin") {
    const remaining = await countSuperadmins(id);
    if (remaining === 0) {
      throw new DataError("No puedes eliminar al único superadmin que queda.");
    }
  }

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(`No se pudo eliminar el usuario: ${error.message}`);
  if (!data || data.length === 0) {
    throw new DataError("Usuario no encontrado.", 404);
  }
}

// ── Ventas ───────────────────────────────────────────────────────────────

type SaleItemRow = {
  id: number;
  quantity: number;
  unit_price: number | string;
  cost_price: number | string;
  product_name_snapshot: string | null;
  size_snapshot: string | null;
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
  "id, channel, staff_name, customer_note, sold_at, sale_items(id, quantity, unit_price, cost_price, product_name_snapshot, size_snapshot, product_variants(size, product_id, products(name)))";

function rowToSale(row: SaleRow): Sale {
  // product_name_snapshot/size_snapshot solo existen en ventas importadas
  // desde CSV (sin variant_id, para no tocar el stock actual): ahí no hay
  // join a product_variants, así que el nombre/talla se leen de ese texto
  // guardado al importar en vez de la relación.
  const items: SaleLine[] = (row.sale_items ?? []).map((si) => ({
    id: si.id,
    productId: si.product_variants?.product_id ?? "",
    name: si.product_variants?.products?.name ?? si.product_name_snapshot ?? "—",
    size: si.product_variants?.size ?? si.size_snapshot ?? "—",
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

/**
 * Antes de borrar la venta, repone el stock que se descontó al registrarla
 * (un movimiento "return" por cada línea con variant_id real) — si no, el
 * stock quedaría descontado para siempre por una venta que ya no existe.
 * Las líneas importadas desde CSV (variant_id null) no tenían stock
 * descontado, así que no generan reposición.
 */
export async function deleteSale(id: string): Promise<void> {
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("sale_items")
    .select("variant_id, quantity")
    .eq("sale_id", id);
  if (itemsError) fail(`No se pudo leer la venta: ${itemsError.message}`);
  if (!items || items.length === 0) throw new DataError("Venta no encontrada.", 404);

  for (const item of items as { variant_id: string | null; quantity: number }[]) {
    if (!item.variant_id) continue;
    const { error } = await supabaseAdmin.from("inventory_movements").insert({
      variant_id: item.variant_id,
      movement_type: "return",
      quantity_delta: item.quantity,
      note: "Reposición de stock por eliminación de venta",
    });
    if (error) fail(`No se pudo reponer el stock: ${error.message}`);
  }

  const { error } = await supabaseAdmin.from("sales").delete().eq("id", id);
  if (error) fail(`No se pudo eliminar la venta: ${error.message}`);
}

export type SaleImportRow = {
  soldAt: string;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  channel: SaleChannel;
  staffName?: string | null;
  note?: string | null;
};

export type SaleImportResult = {
  imported: number;
  errors: { row: number; message: string }[];
};

/**
 * Carga ventas que ya ocurrieron antes de tener el sistema (desde un CSV).
 * A propósito NO usa el RPC record_sale ni linkea variant_id: son hechos
 * pasados, no deben descontar stock actual. El nombre/talla se guardan como
 * texto plano (product_name_snapshot/size_snapshot) porque sin variant_id
 * no hay de dónde sacarlos por join. Sigue de largo ante errores por fila
 * (reporta cuáles fallaron) en vez de abortar todo el archivo.
 */
export async function importHistoricalSales(
  rows: SaleImportRow[],
): Promise<SaleImportResult> {
  let imported = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const saleId = `s-${randomUUID().slice(0, 8)}`;
    try {
      const { error: saleError } = await supabaseAdmin.from("sales").insert({
        id: saleId,
        channel: r.channel,
        staff_name: r.staffName ?? null,
        customer_note: r.note ?? null,
        sold_at: r.soldAt,
      });
      if (saleError) throw new Error(saleError.message);

      const { error: itemError } = await supabaseAdmin.from("sale_items").insert({
        sale_id: saleId,
        variant_id: null,
        quantity: r.quantity,
        unit_price: r.unitPrice,
        cost_price: r.costPrice,
        product_name_snapshot: r.productName,
        size_snapshot: r.size,
      });
      if (itemError) {
        await supabaseAdmin.from("sales").delete().eq("id", saleId);
        throw new Error(itemError.message);
      }

      imported++;
    } catch (err) {
      errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : "Error desconocido.",
      });
    }
  }

  return { imported, errors };
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
