import "server-only";
import { cache } from "react";
import { randomUUID } from "crypto";
import type {
  Category,
  Page,
  PagePlacement,
  Patch,
  Product,
  ProductNotice,
  ProductVariant,
  Sale,
  SaleChannel,
  SaleLine,
  ShippingMethod,
  StockMode,
  Tag,
} from "@/lib/catalog";
import {
  descendantSlugs,
  importTotalGs,
  lineProfit,
  lineTotal,
  normalizePhone,
  saleTotal,
  SIZES_ADULT,
  wouldCreateCycle,
  type ImportCostInput,
} from "@/lib/catalog";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { SiteSettingsKey } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  hashPassword,
  ROLE_LABELS,
  verifyPassword,
  type AdminRole,
} from "@/lib/admin-auth";

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
  wholesale_price: number | string | null;
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
  is_customizable: boolean;
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

function rowToProduct(
  row: ProductRow,
  variantRows: VariantRow[],
  patches: Patch[] = [],
): Product {
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
    wholesalePrice: row.wholesale_price != null ? Number(row.wholesale_price) : null,
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
    isCustomizable: row.is_customizable,
    patches,
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

type PatchRow = {
  id: string;
  name: string;
  image: string | null;
  price: number | string;
  is_visible: boolean;
};

function rowToPatch(row: PatchRow): Patch {
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    price: Number(row.price),
    isVisible: row.is_visible,
  };
}

async function fetchPatchesByProduct(
  productIds: string[],
): Promise<Map<string, Patch[]>> {
  const map = new Map<string, Patch[]>();
  if (productIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("product_patches")
    .select("product_id, patches(*)")
    .in("product_id", productIds);
  if (error) fail(`No se pudieron cargar los parches del producto: ${error.message}`);

  const rows = data as unknown as {
    product_id: string;
    patches: PatchRow | PatchRow[] | null;
  }[];
  for (const row of rows) {
    if (!row.patches) continue;
    const patchRows = Array.isArray(row.patches) ? row.patches : [row.patches];
    const list = map.get(row.product_id) ?? [];
    for (const patchRow of patchRows) list.push(rowToPatch(patchRow));
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
  const [variantMap, patchMap] = await Promise.all([
    fetchVariantsByProduct(row.stock_mode === "propio" ? [row.id] : []),
    fetchPatchesByProduct([row.id]),
  ]);
  return rowToProduct(row, variantMap.get(row.id) ?? [], patchMap.get(row.id) ?? []);
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
  const allIds = rows.map((r) => r.id);
  const [variantMap, patchMap] = await Promise.all([
    fetchVariantsByProduct(propioIds),
    fetchPatchesByProduct(allIds),
  ]);

  return rows.map((row) =>
    rowToProduct(row, variantMap.get(row.id) ?? [], patchMap.get(row.id) ?? []),
  );
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
  "id" | "slug" | "variants" | "sizes" | "soldOut" | "patches"
> & {
  slug?: string;
  /** Cantidad por talla. Sólo se usa (y se exige) cuando stockMode === "propio". */
  variantQuantities?: Record<string, number>;
  /** Ids de los parches que se le pueden poner a este producto. */
  patchIds?: string[];
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
    wholesale_price: input.wholesalePrice ?? null,
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
    is_customizable: Boolean(input.isCustomizable),
  };
}

/** Reemplazo completo (no diff): sin cantidad ni ledger que preservar, a
 * diferencia de syncProductVariants — se borra todo y se inserta de nuevo. */
async function syncProductPatches(productId: string, patchIds: string[]): Promise<void> {
  const { error: deleteError } = await supabaseAdmin
    .from("product_patches")
    .delete()
    .eq("product_id", productId);
  if (deleteError) {
    fail(`No se pudieron actualizar los parches del producto: ${deleteError.message}`);
  }

  if (patchIds.length === 0) return;

  const { error: insertError } = await supabaseAdmin
    .from("product_patches")
    .insert(patchIds.map((patchId) => ({ product_id: productId, patch_id: patchId })));
  if (insertError) {
    fail(`No se pudieron actualizar los parches del producto: ${insertError.message}`);
  }
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
  await syncProductPatches(id, input.patchIds ?? []);

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
  await syncProductPatches(id, input.patchIds ?? []);

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
  last_seen_at: string | null;
};

/** Nunca incluye password_hash — eso solo lo maneja verifyAdminCredentials. */
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt: string;
  /** Último heartbeat del panel abierto en el navegador — null = nunca conectado. */
  lastSeenAt: string | null;
};

const ADMIN_USER_SELECT = "id, name, email, role, created_at, last_seen_at";

function rowToAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
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
    .select(ADMIN_USER_SELECT)
    .order("created_at", { ascending: true });
  if (error) fail(`No se pudieron cargar los usuarios del panel: ${error.message}`);
  return (data as AdminUserRow[]).map(rowToAdminUser);
}

export async function getAdminUserById(id: string): Promise<AdminUser | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select(ADMIN_USER_SELECT)
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
  if (!Object.keys(ROLE_LABELS).includes(input.role)) {
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
    .select(ADMIN_USER_SELECT)
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
  if (!Object.keys(ROLE_LABELS).includes(input.role)) {
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
    .select(ADMIN_USER_SELECT)
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

/** La llama el heartbeat del panel, no un formulario — sin validaciones. */
export async function touchAdminLastSeen(adminId: string): Promise<void> {
  await supabaseAdmin
    .from("admin_users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", adminId);
}

// ── Ventas ───────────────────────────────────────────────────────────────

type SaleItemRow = {
  id: number;
  quantity: number;
  unit_price: number | string;
  cost_price: number | string;
  product_name_snapshot: string | null;
  size_snapshot: string | null;
  product_id_snapshot: string | null;
  item_note: string | null;
  product_variants: {
    size: string;
    product_id: string;
    products: { name: string; images: string[] | null } | null;
  } | null;
};

type SaleRow = {
  id: string;
  channel: SaleChannel;
  staff_name: string | null;
  customer_note: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  destination_city: string | null;
  destination_neighborhood: string | null;
  shipping_method: ShippingMethod | null;
  shipping_method_detail: string | null;
  customer_id: string | null;
  sold_at: string;
  sale_items: SaleItemRow[];
};

const SALE_SELECT =
  "id, channel, staff_name, customer_note, customer_name, customer_phone, destination_city, destination_neighborhood, shipping_method, shipping_method_detail, customer_id, sold_at, sale_items(id, quantity, unit_price, cost_price, product_name_snapshot, size_snapshot, product_id_snapshot, item_note, product_variants(size, product_id, products(name, images)))";

function rowToSale(row: SaleRow): Sale {
  // product_name_snapshot/size_snapshot solo existen en ventas importadas
  // desde CSV o dropshipping (sin variant_id, para no tocar el stock
  // actual): ahí no hay join a product_variants, así que el nombre/talla
  // se leen de ese texto guardado al vender en vez de la relación. La
  // imagen para esas líneas se resuelve aparte en getSales() a partir de
  // product_id_snapshot (dropshipping sí referencia un producto real,
  // a diferencia de una importación de CSV histórico).
  const items: SaleLine[] = (row.sale_items ?? []).map((si) => ({
    id: si.id,
    productId: si.product_variants?.product_id ?? si.product_id_snapshot ?? "",
    name: si.product_variants?.products?.name ?? si.product_name_snapshot ?? "—",
    size: si.product_variants?.size ?? si.size_snapshot ?? "—",
    quantity: si.quantity,
    unitPrice: Number(si.unit_price),
    costPrice: Number(si.cost_price),
    imageUrl: si.product_variants?.products?.images?.[0] ?? null,
    note: si.item_note,
  }));

  return {
    id: row.id,
    channel: row.channel,
    staffName: row.staff_name,
    customerNote: row.customer_note,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    destinationCity: row.destination_city,
    destinationNeighborhood: row.destination_neighborhood,
    shippingMethod: row.shipping_method,
    shippingMethodDetail: row.shipping_method_detail,
    customerId: row.customer_id,
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
  const sales = (data as unknown as SaleRow[]).map(rowToSale);

  // Las líneas de dropshipping no tienen join a product_variants (no
  // llevan stock), así que su imagen no salió resuelta arriba — se busca
  // en una sola consulta aparte por product_id_snapshot.
  const missingProductIds = new Set<string>();
  for (const sale of sales) {
    for (const item of sale.items) {
      if (!item.imageUrl && item.productId) missingProductIds.add(item.productId);
    }
  }
  if (missingProductIds.size > 0) {
    const { data: productRows } = await supabaseAdmin
      .from("products")
      .select("id, images")
      .in("id", Array.from(missingProductIds));
    const imageById = new Map(
      (productRows ?? []).map((p) => [
        p.id as string,
        ((p.images as string[] | null) ?? [])[0] ?? null,
      ]),
    );
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!item.imageUrl && item.productId) {
          item.imageUrl = imageById.get(item.productId) ?? null;
        }
      }
    }
  }

  return sales;
}

export type SaleItemInput = {
  /** Presente = descuenta stock propio. Ausente = dropshipping (usa productName/size). */
  variantId?: string | null;
  /** Id real del producto elegido (propio o dropshipping) — para poder mostrar su imagen después. */
  productId?: string | null;
  productName?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  /** Detalle del artículo: personalización, parches, etc. */
  itemNote?: string | null;
};

export type SaleInput = {
  channel: SaleChannel;
  staffName?: string | null;
  customerNote?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  destinationCity?: string | null;
  destinationNeighborhood?: string | null;
  shippingMethod?: ShippingMethod | null;
  shippingMethodDetail?: string | null;
  /** ISO datetime. Vacío/null = ahora mismo (default de la base). */
  soldAt?: string | null;
  /** Ubicación marcada a mano en el mapa al registrar la venta — se guarda
   * en el cliente (crm_customers), no en la venta. Solo si el admin tocó el
   * mapa; si no, la ubicación existente del cliente queda intacta. */
  customerLat?: number | null;
  customerLng?: number | null;
  items: SaleItemInput[];
};

function assertValidSale(input: SaleInput) {
  if (!input.items || input.items.length === 0) {
    throw new DataError("Agrega al menos un artículo a la venta.");
  }
  for (const item of input.items) {
    if (!item.variantId && (!item.productName || !item.size)) {
      throw new DataError("Falta seleccionar el producto y la talla.");
    }
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

  // CRM ligero: si hay teléfono, vincula a un cliente existente (por
  // teléfono normalizado) o crea uno nuevo — sin esto, cada venta queda
  // aislada y no se puede ver historial/gasto total por persona.
  const customerId = await findOrCreateCustomerByPhone(
    input.customerName ?? null,
    input.customerPhone ?? null,
    input.destinationCity ?? null,
    input.customerLat ?? null,
    input.customerLng ?? null,
  );

  const id = `s-${randomUUID().slice(0, 8)}`;
  const { error } = await supabaseAdmin.rpc("record_sale", {
    p_id: id,
    p_channel: input.channel,
    p_staff_name: input.staffName ?? null,
    p_customer_note: input.customerNote ?? null,
    p_sold_at: input.soldAt || null,
    p_customer_name: input.customerName || null,
    p_customer_phone: input.customerPhone || null,
    p_destination_city: input.destinationCity || null,
    p_destination_neighborhood: input.destinationNeighborhood || null,
    p_shipping_method: input.shippingMethod || null,
    p_shipping_method_detail: input.shippingMethodDetail || null,
    p_customer_id: customerId,
    p_items: input.items.map((i) => ({
      variant_id: i.variantId ?? null,
      product_id_snapshot: i.productId ?? null,
      product_name_snapshot: i.variantId ? null : i.productName ?? null,
      size_snapshot: i.variantId ? null : i.size ?? null,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      cost_price: i.costPrice,
      item_note: i.itemNote?.trim() || null,
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

// ── Clientes (CRM ligero) ───────────────────────────────────────────────
// Entidad propia para poder ver historial de compras y gasto total por
// persona. Vive en la tabla crm_customers (no "customers": ese nombre ya
// lo ocupa el login de clientes descartado, 1:1 con auth.users).

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const CUSTOMER_SELECT =
  "id, name, phone, city, neighborhood, latitude, longitude, notes, created_at, updated_at";

function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    city: row.city,
    neighborhood: row.neighborhood,
    latitude: row.latitude,
    longitude: row.longitude,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllCustomers(): Promise<Customer[]> {
  const { data, error } = await supabaseAdmin
    .from("crm_customers")
    .select(CUSTOMER_SELECT)
    .order("created_at", { ascending: true });
  if (error) fail(`No se pudieron cargar los clientes: ${error.message}`);
  return (data as CustomerRow[]).map(rowToCustomer);
}

export type CustomerInput = {
  name: string;
  phone?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

function assertValidCustomer(input: CustomerInput) {
  if (!input.name?.trim()) throw new DataError("El nombre es obligatorio.");
  if (input.latitude != null && (input.latitude < -90 || input.latitude > 90)) {
    throw new DataError("La latitud no es válida.");
  }
  if (input.longitude != null && (input.longitude < -180 || input.longitude > 180)) {
    throw new DataError("La longitud no es válida.");
  }
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  assertValidCustomer(input);

  const id = `cli-${randomUUID().slice(0, 8)}`;
  const phone = input.phone?.trim() || null;
  const { data, error } = await supabaseAdmin
    .from("crm_customers")
    .insert({
      id,
      name: input.name.trim(),
      phone,
      phone_normalized: phone ? normalizePhone(phone) : null,
      city: input.city?.trim() || null,
      neighborhood: input.neighborhood?.trim() || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      notes: input.notes?.trim() || null,
    })
    .select(CUSTOMER_SELECT)
    .single();

  if (error) fail(`No se pudo crear el cliente: ${error.message}`);
  return rowToCustomer(data as CustomerRow);
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
): Promise<Customer> {
  assertValidCustomer(input);

  const phone = input.phone?.trim() || null;
  const { data, error } = await supabaseAdmin
    .from("crm_customers")
    .update({
      name: input.name.trim(),
      phone,
      phone_normalized: phone ? normalizePhone(phone) : null,
      city: input.city?.trim() || null,
      neighborhood: input.neighborhood?.trim() || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id)
    .select(CUSTOMER_SELECT)
    .single();

  if (error) fail(`No se pudo actualizar el cliente: ${error.message}`);
  if (!data) throw new DataError("Cliente no encontrado.", 404);
  return rowToCustomer(data as CustomerRow);
}

export async function deleteCustomer(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("crm_customers")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(`No se pudo eliminar el cliente: ${error.message}`);
  if (!data || data.length === 0) {
    throw new DataError("Cliente no encontrado.", 404);
  }
}

/**
 * Vincula la venta a un cliente existente (por teléfono normalizado) o
 * crea uno nuevo. Sin teléfono, devuelve null — la venta queda como
 * ocasional/anónima, igual que antes de tener esta tabla. No sobreescribe
 * nombre/ciudad de un cliente ya existente: un typo puntual en una venta
 * no debe arruinar el registro canónico (el admin lo corrige a mano desde
 * Clientes si hace falta).
 *
 * La ubicación (lat/lng) es distinta: si el admin marcó un pin al
 * registrar esta venta, es una acción deliberada (no texto libre propenso
 * a typos), así que sí actualiza la ubicación del cliente existente. Si
 * no se marcó nada (lat/lng null), la ubicación previa del cliente queda
 * intacta.
 */
async function findOrCreateCustomerByPhone(
  name: string | null,
  phone: string | null,
  city: string | null,
  lat?: number | null,
  lng?: number | null,
): Promise<string | null> {
  const trimmedPhone = phone?.trim();
  if (!trimmedPhone) return null;
  const normalized = normalizePhone(trimmedPhone);
  if (!normalized) return null;

  const { data: existing, error: findError } = await supabaseAdmin
    .from("crm_customers")
    .select("id")
    .eq("phone_normalized", normalized)
    .maybeSingle();
  if (findError) {
    fail(`No se pudo buscar el cliente: ${findError.message}`);
  }
  if (existing) {
    const existingId = (existing as { id: string }).id;
    if (lat != null && lng != null) {
      const { error: updateError } = await supabaseAdmin
        .from("crm_customers")
        .update({ latitude: lat, longitude: lng })
        .eq("id", existingId);
      if (updateError) {
        fail(`No se pudo actualizar la ubicación del cliente: ${updateError.message}`);
      }
    }
    return existingId;
  }

  const created = await createCustomer({
    name: name?.trim() || "Cliente sin nombre",
    phone: trimmedPhone,
    city,
    latitude: lat ?? null,
    longitude: lng ?? null,
  });
  return created.id;
}

export type CustomerWithStats = Customer & {
  orderCount: number;
  totalSpent: number;
  lastPurchaseAt: string | null;
};

export async function getCustomersWithStats(): Promise<CustomerWithStats[]> {
  const [customers, sales] = await Promise.all([getAllCustomers(), getSales()]);

  const statsByCustomer = new Map<
    string,
    { orderCount: number; totalSpent: number; lastPurchaseAt: string | null }
  >();
  for (const sale of sales) {
    if (!sale.customerId) continue;
    const prev = statsByCustomer.get(sale.customerId) ?? {
      orderCount: 0,
      totalSpent: 0,
      lastPurchaseAt: null as string | null,
    };
    prev.orderCount += 1;
    prev.totalSpent += saleTotal(sale);
    if (!prev.lastPurchaseAt || sale.soldAt > prev.lastPurchaseAt) {
      prev.lastPurchaseAt = sale.soldAt;
    }
    statsByCustomer.set(sale.customerId, prev);
  }

  return customers.map((customer) => ({
    ...customer,
    ...(statsByCustomer.get(customer.id) ?? {
      orderCount: 0,
      totalSpent: 0,
      lastPurchaseAt: null,
    }),
  }));
}

export async function getCustomerSales(customerId: string): Promise<Sale[]> {
  const sales = await getSales();
  return sales.filter((s) => s.customerId === customerId);
}

// ── Finanzas ────────────────────────────────────────────────────────────

type FinanceAccountRow = {
  id: string;
  name: string;
  kind: string;
  balance: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceAccountKind =
  | "efectivo"
  | "cuenta_bancaria"
  | "tarjeta_credito"
  | "tarjeta_debito";

export type FinanceAccount = {
  id: string;
  name: string;
  kind: FinanceAccountKind;
  balance: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function rowToFinanceAccount(row: FinanceAccountRow): FinanceAccount {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as FinanceAccountKind,
    balance: Number(row.balance),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const FINANCE_ACCOUNT_KINDS: FinanceAccountKind[] = [
  "efectivo",
  "cuenta_bancaria",
  "tarjeta_credito",
  "tarjeta_debito",
];

export async function getFinanceAccounts(): Promise<FinanceAccount[]> {
  const { data, error } = await supabaseAdmin
    .from("finance_accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) fail(`No se pudieron cargar las cuentas: ${error.message}`);
  return (data as FinanceAccountRow[]).map(rowToFinanceAccount);
}

export type FinanceAccountInput = {
  name: string;
  kind: FinanceAccountKind;
  balance: number;
  notes?: string | null;
};

function assertValidFinanceAccount(input: FinanceAccountInput) {
  if (!input.name?.trim()) throw new DataError("El nombre es obligatorio.");
  if (!FINANCE_ACCOUNT_KINDS.includes(input.kind)) {
    throw new DataError("Selecciona un tipo de cuenta válido.");
  }
  if (!Number.isFinite(input.balance)) {
    throw new DataError("El saldo no es válido.");
  }
}

export async function createFinanceAccount(
  input: FinanceAccountInput,
): Promise<FinanceAccount> {
  assertValidFinanceAccount(input);

  const id = `acc-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabaseAdmin
    .from("finance_accounts")
    .insert({
      id,
      name: input.name.trim(),
      kind: input.kind,
      balance: input.balance,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) fail(`No se pudo crear la cuenta: ${error.message}`);
  return rowToFinanceAccount(data as FinanceAccountRow);
}

export async function updateFinanceAccount(
  id: string,
  input: FinanceAccountInput,
): Promise<FinanceAccount> {
  assertValidFinanceAccount(input);

  const { data, error } = await supabaseAdmin
    .from("finance_accounts")
    .update({
      name: input.name.trim(),
      kind: input.kind,
      balance: input.balance,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) fail(`No se pudo actualizar la cuenta: ${error.message}`);
  if (!data) throw new DataError("Cuenta no encontrada.", 404);
  return rowToFinanceAccount(data as FinanceAccountRow);
}

export async function deleteFinanceAccount(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("finance_accounts")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(`No se pudo eliminar la cuenta: ${error.message}`);
  if (!data || data.length === 0) throw new DataError("Cuenta no encontrada.", 404);
}

type FinanceEntryRow = {
  id: string;
  type: string;
  category: string | null;
  amount: number | string;
  account_id: string | null;
  expense_kind: string | null;
  note: string | null;
  occurred_at: string;
  created_by: string | null;
  created_at: string;
  finance_accounts: { name: string } | null;
};

export type ExpenseKind = "fijo" | "variable";

export type FinanceEntryType =
  | "ingreso"
  | "gasto"
  | "capital_aporte"
  | "capital_retiro"
  | "importacion";

export type FinanceEntry = {
  id: string;
  type: FinanceEntryType;
  category: string | null;
  amount: number;
  accountId: string | null;
  accountName: string | null;
  /** Solo tiene sentido cuando type === "gasto"; el resto queda null. */
  expenseKind: ExpenseKind | null;
  note: string | null;
  occurredAt: string;
  createdBy: string | null;
  createdAt: string;
};

const FINANCE_ENTRY_SELECT =
  "id, type, category, amount, account_id, expense_kind, note, occurred_at, created_by, created_at, finance_accounts(name)";

const FINANCE_ENTRY_TYPES: FinanceEntryType[] = [
  "ingreso",
  "gasto",
  "capital_aporte",
  "capital_retiro",
  "importacion",
];

function rowToFinanceEntry(row: FinanceEntryRow): FinanceEntry {
  return {
    id: row.id,
    type: row.type as FinanceEntryType,
    category: row.category,
    amount: Number(row.amount),
    accountId: row.account_id,
    accountName: row.finance_accounts?.name ?? null,
    expenseKind: (row.expense_kind as ExpenseKind | null) ?? null,
    note: row.note,
    occurredAt: row.occurred_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function getFinanceEntries(
  range?: { from?: string; to?: string },
  type?: FinanceEntryType,
): Promise<FinanceEntry[]> {
  let query = supabaseAdmin
    .from("finance_entries")
    .select(FINANCE_ENTRY_SELECT)
    .order("occurred_at", { ascending: false });

  if (range?.from) query = query.gte("occurred_at", range.from);
  if (range?.to) query = query.lte("occurred_at", range.to);
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) fail(`No se pudieron cargar los movimientos financieros: ${error.message}`);
  return (data as unknown as FinanceEntryRow[]).map(rowToFinanceEntry);
}

export type FinanceEntryInput = {
  type: FinanceEntryType;
  category?: string | null;
  amount: number;
  accountId?: string | null;
  expenseKind?: ExpenseKind | null;
  note?: string | null;
  occurredAt?: string;
  adminName?: string | null;
};

function assertValidFinanceEntry(input: FinanceEntryInput) {
  if (!FINANCE_ENTRY_TYPES.includes(input.type)) {
    throw new DataError("Selecciona un tipo de movimiento válido.");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new DataError("El monto debe ser mayor que 0.");
  }
  if (input.expenseKind && !["fijo", "variable"].includes(input.expenseKind)) {
    throw new DataError("Selecciona si el gasto es fijo o variable.");
  }
}

export async function createFinanceEntry(
  input: FinanceEntryInput,
): Promise<FinanceEntry> {
  assertValidFinanceEntry(input);

  const id = `fin-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabaseAdmin
    .from("finance_entries")
    .insert({
      id,
      type: input.type,
      category: input.category?.trim() || null,
      amount: input.amount,
      account_id: input.accountId || null,
      expense_kind: input.type === "gasto" ? input.expenseKind ?? null : null,
      note: input.note?.trim() || null,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      created_by: input.adminName ?? null,
    })
    .select(FINANCE_ENTRY_SELECT)
    .single();

  if (error) fail(`No se pudo registrar el movimiento: ${error.message}`);
  return rowToFinanceEntry(data as unknown as FinanceEntryRow);
}

export async function updateFinanceEntry(
  id: string,
  input: FinanceEntryInput,
): Promise<FinanceEntry> {
  assertValidFinanceEntry(input);

  const { data, error } = await supabaseAdmin
    .from("finance_entries")
    .update({
      type: input.type,
      category: input.category?.trim() || null,
      amount: input.amount,
      account_id: input.accountId || null,
      expense_kind: input.type === "gasto" ? input.expenseKind ?? null : null,
      note: input.note?.trim() || null,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
    })
    .eq("id", id)
    .select(FINANCE_ENTRY_SELECT)
    .single();

  if (error) fail(`No se pudo actualizar el movimiento: ${error.message}`);
  if (!data) throw new DataError("Movimiento no encontrado.", 404);
  return rowToFinanceEntry(data as unknown as FinanceEntryRow);
}

export async function deleteFinanceEntry(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("finance_entries")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(`No se pudo eliminar el movimiento: ${error.message}`);
  if (!data || data.length === 0) {
    throw new DataError("Movimiento no encontrado.", 404);
  }
}

type MerchandisePurchaseRow = {
  id: string;
  product_name: string;
  quantity: number;
  unit_cost: number | string;
  supplier: string | null;
  note: string | null;
  purchased_at: string;
  created_by: string | null;
  created_at: string;
};

export type MerchandisePurchase = {
  id: string;
  productName: string;
  quantity: number;
  unitCost: number;
  supplier: string | null;
  note: string | null;
  purchasedAt: string;
  createdBy: string | null;
  createdAt: string;
};

function rowToMerchandisePurchase(row: MerchandisePurchaseRow): MerchandisePurchase {
  return {
    id: row.id,
    productName: row.product_name,
    quantity: row.quantity,
    unitCost: Number(row.unit_cost),
    supplier: row.supplier,
    note: row.note,
    purchasedAt: row.purchased_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function getMerchandisePurchases(range?: {
  from?: string;
  to?: string;
}): Promise<MerchandisePurchase[]> {
  let query = supabaseAdmin
    .from("merchandise_purchases")
    .select("*")
    .order("purchased_at", { ascending: false });

  if (range?.from) query = query.gte("purchased_at", range.from);
  if (range?.to) query = query.lte("purchased_at", range.to);

  const { data, error } = await query;
  if (error) fail(`No se pudieron cargar las compras: ${error.message}`);
  return (data as MerchandisePurchaseRow[]).map(rowToMerchandisePurchase);
}

export type MerchandisePurchaseInput = {
  productName: string;
  quantity: number;
  unitCost: number;
  supplier?: string | null;
  note?: string | null;
  purchasedAt?: string;
  adminName?: string | null;
};

function assertValidPurchase(input: MerchandisePurchaseInput) {
  if (!input.productName?.trim()) throw new DataError("El producto es obligatorio.");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new DataError("La cantidad debe ser mayor que 0.");
  }
  if (!Number.isFinite(input.unitCost) || input.unitCost < 0) {
    throw new DataError("El precio de compra no es válido.");
  }
}

export async function createMerchandisePurchase(
  input: MerchandisePurchaseInput,
): Promise<MerchandisePurchase> {
  assertValidPurchase(input);

  const id = `pur-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabaseAdmin
    .from("merchandise_purchases")
    .insert({
      id,
      product_name: input.productName.trim(),
      quantity: input.quantity,
      unit_cost: input.unitCost,
      supplier: input.supplier?.trim() || null,
      note: input.note?.trim() || null,
      purchased_at: input.purchasedAt ?? new Date().toISOString(),
      created_by: input.adminName ?? null,
    })
    .select("*")
    .single();

  if (error) fail(`No se pudo registrar la compra: ${error.message}`);
  return rowToMerchandisePurchase(data as MerchandisePurchaseRow);
}

export async function updateMerchandisePurchase(
  id: string,
  input: MerchandisePurchaseInput,
): Promise<MerchandisePurchase> {
  assertValidPurchase(input);

  const { data, error } = await supabaseAdmin
    .from("merchandise_purchases")
    .update({
      product_name: input.productName.trim(),
      quantity: input.quantity,
      unit_cost: input.unitCost,
      supplier: input.supplier?.trim() || null,
      note: input.note?.trim() || null,
      purchased_at: input.purchasedAt ?? new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) fail(`No se pudo actualizar la compra: ${error.message}`);
  if (!data) throw new DataError("Compra no encontrada.", 404);
  return rowToMerchandisePurchase(data as MerchandisePurchaseRow);
}

export async function deleteMerchandisePurchase(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("merchandise_purchases")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(`No se pudo eliminar la compra: ${error.message}`);
  if (!data || data.length === 0) throw new DataError("Compra no encontrada.", 404);
}

export type FinanceSummary = {
  ventasTotal: number;
  ventasGanancia: number;
  margenPromedio: number;
  ingresosOtros: number;
  gastos: number;
  gastosPorCategoria: { category: string; amount: number }[];
  importacion: number;
  comprasMercaderia: number;
  importacionesChina: number;
  capitalNeto: number;
  utilidadNeta: number;
  serieMensual: { month: string; ingresos: number; gastos: number }[];
};

/**
 * Junta todo lo necesario para el dashboard de Finanzas en un solo lugar:
 * las ventas del rango (ingresos "de verdad", ya registrados en Ventas, no
 * se duplican como finance_entries) más los movimientos financieros
 * manuales (gastos, importación, capital, otros ingresos).
 */
export async function getFinanceSummary(range?: {
  from?: string;
  to?: string;
}): Promise<FinanceSummary> {
  const [sales, entries, purchases, importPurchases] = await Promise.all([
    getSales(range),
    getFinanceEntries(range),
    getMerchandisePurchases(range),
    getImportPurchases(range),
  ]);

  const ventasTotal = sales.reduce(
    (acc, s) => acc + s.items.reduce((a, i) => a + lineTotal(i), 0),
    0,
  );
  const ventasGanancia = sales.reduce(
    (acc, s) => acc + s.items.reduce((a, i) => a + lineProfit(i), 0),
    0,
  );
  const margenPromedio = ventasTotal > 0 ? (ventasGanancia / ventasTotal) * 100 : 0;

  const comprasMercaderia = purchases.reduce(
    (acc, p) => acc + p.unitCost * p.quantity,
    0,
  );

  // Mismo criterio que comprasMercaderia: informativo, no resta de
  // utilidadNeta (el costo ya queda reflejado en costPrice al vender).
  const importacionesChina = importPurchases.reduce((acc, p) => acc + p.totalGs, 0);

  const mensual = new Map<string, { ingresos: number; gastos: number }>();
  const addMonthly = (dateStr: string, field: "ingresos" | "gastos", amount: number) => {
    const month = dateStr.slice(0, 7); // "YYYY-MM"
    const current = mensual.get(month) ?? { ingresos: 0, gastos: 0 };
    current[field] += amount;
    mensual.set(month, current);
  };
  for (const s of sales) {
    addMonthly(
      s.soldAt,
      "ingresos",
      s.items.reduce((a, i) => a + lineTotal(i), 0),
    );
  }

  let ingresosOtros = 0;
  let gastos = 0;
  let importacion = 0;
  let capitalNeto = 0;
  const gastosPorCategoriaMap = new Map<string, number>();

  for (const e of entries) {
    switch (e.type) {
      case "ingreso":
        ingresosOtros += e.amount;
        addMonthly(e.occurredAt, "ingresos", e.amount);
        break;
      case "gasto": {
        gastos += e.amount;
        addMonthly(e.occurredAt, "gastos", e.amount);
        const cat = e.category || "Sin categoría";
        gastosPorCategoriaMap.set(cat, (gastosPorCategoriaMap.get(cat) ?? 0) + e.amount);
        break;
      }
      case "importacion":
        importacion += e.amount;
        addMonthly(e.occurredAt, "gastos", e.amount);
        break;
      case "capital_aporte":
        capitalNeto += e.amount;
        break;
      case "capital_retiro":
        capitalNeto -= e.amount;
        break;
    }
  }

  // Ganancia de ventas (ya neta del costo del producto) + otros ingresos,
  // menos gastos e importación. Los aportes/retiros de capital NO entran
  // acá: son financiamiento, no resultado operativo del negocio. Las
  // compras de mercadería TAMPOCO restan acá a propósito: su costo ya
  // queda reflejado en la ganancia de cada venta (costPrice), restarlo de
  // nuevo acá duplicaría el gasto. comprasMercaderia se muestra aparte,
  // solo como referencia de flujo de caja ("cuánto salió a reponer stock").
  const utilidadNeta = ventasGanancia + ingresosOtros - gastos - importacion;

  const serieMensual = [...mensual.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  const gastosPorCategoria = [...gastosPorCategoriaMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    ventasTotal,
    ventasGanancia,
    margenPromedio,
    ingresosOtros,
    gastos,
    gastosPorCategoria,
    importacion,
    comprasMercaderia,
    importacionesChina,
    capitalNeto,
    utilidadNeta,
    serieMensual,
  };
}

export type InventoryValuation = {
  costValue: number;
  retailValue: number;
  totalUnits: number;
};

/** Cuánto vale el stock propio disponible ahora — a costo (lo que salió
 * comprarlo) y a precio de venta (lo que facturaría si se vende todo). */
export async function getInventoryValuation(): Promise<InventoryValuation> {
  const products = await getAllProducts({ includeHidden: true });

  let costValue = 0;
  let retailValue = 0;
  let totalUnits = 0;

  for (const p of products) {
    if (p.stockMode !== "propio" || !p.variants) continue;
    const stock = p.variants.reduce((acc, v) => acc + v.stock, 0);
    totalUnits += stock;
    retailValue += p.price * stock;
    if (p.costPrice != null) costValue += p.costPrice * stock;
  }

  return { costValue, retailValue, totalUnits };
}

export type LiquiditySummary = {
  efectivo: number;
  cuentaBancaria: number;
  tarjetaCredito: number;
  tarjetaDebito: number;
  /** efectivo + cuenta bancaria + crédito disponible (no incluye débito, ya representa la misma plata que la cuenta bancaria). */
  liquidezTotal: number;
};

export async function getLiquiditySummary(): Promise<LiquiditySummary> {
  const accounts = await getFinanceAccounts();
  const sumBy = (kind: FinanceAccountKind) =>
    accounts
      .filter((a) => a.kind === kind)
      .reduce((acc, a) => acc + a.balance, 0);

  const efectivo = sumBy("efectivo");
  const cuentaBancaria = sumBy("cuenta_bancaria");
  const tarjetaCredito = sumBy("tarjeta_credito");
  const tarjetaDebito = sumBy("tarjeta_debito");

  return {
    efectivo,
    cuentaBancaria,
    tarjetaCredito,
    tarjetaDebito,
    liquidezTotal: efectivo + cuentaBancaria + tarjetaCredito,
  };
}

// ── Importaciones (China) ──────────────────────────────────────────────

type ImportCourierRow = {
  id: string;
  name: string;
  cost_per_kg: number | string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ImportCourier = {
  id: string;
  name: string;
  costPerKg: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

function rowToImportCourier(row: ImportCourierRow): ImportCourier {
  return {
    id: row.id,
    name: row.name,
    costPerKg: Number(row.cost_per_kg),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getImportCouriers(): Promise<ImportCourier[]> {
  const { data, error } = await supabaseAdmin
    .from("import_couriers")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) fail(`No se pudieron cargar los couriers: ${error.message}`);
  return (data as ImportCourierRow[]).map(rowToImportCourier);
}

export type ImportCourierInput = {
  name: string;
  costPerKg: number;
  note?: string | null;
};

function assertValidImportCourier(input: ImportCourierInput) {
  if (!input.name?.trim()) throw new DataError("El nombre es obligatorio.");
  if (!Number.isFinite(input.costPerKg) || input.costPerKg < 0) {
    throw new DataError("El costo por kilo no es válido.");
  }
}

export async function createImportCourier(
  input: ImportCourierInput,
): Promise<ImportCourier> {
  assertValidImportCourier(input);

  const id = `cur-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabaseAdmin
    .from("import_couriers")
    .insert({
      id,
      name: input.name.trim(),
      cost_per_kg: input.costPerKg,
      note: input.note?.trim() || null,
    })
    .select("*")
    .single();

  if (error) fail(`No se pudo crear el courier: ${error.message}`);
  return rowToImportCourier(data as ImportCourierRow);
}

export async function updateImportCourier(
  id: string,
  input: ImportCourierInput,
): Promise<ImportCourier> {
  assertValidImportCourier(input);

  const { data, error } = await supabaseAdmin
    .from("import_couriers")
    .update({
      name: input.name.trim(),
      cost_per_kg: input.costPerKg,
      note: input.note?.trim() || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) fail(`No se pudo actualizar el courier: ${error.message}`);
  if (!data) throw new DataError("Courier no encontrado.", 404);
  return rowToImportCourier(data as ImportCourierRow);
}

export async function deleteImportCourier(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("import_couriers")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(`No se pudo eliminar el courier: ${error.message}`);
  if (!data || data.length === 0) throw new DataError("Courier no encontrado.", 404);
}

type ImportPurchaseRow = {
  id: string;
  product_name: string;
  cost_usd: number | string;
  exchange_rate: number | string;
  weight_kg: number | string;
  courier_id: string | null;
  courier_name_snapshot: string;
  cost_per_kg_snapshot: number | string;
  tax_rate: number | string;
  note: string | null;
  purchased_at: string;
  created_by: string | null;
  created_at: string;
};

export type ImportPurchase = {
  id: string;
  productName: string;
  costUsd: number;
  exchangeRate: number;
  weightKg: number;
  courierId: string | null;
  courierName: string;
  costPerKg: number;
  taxRate: number;
  note: string | null;
  purchasedAt: string;
  createdBy: string | null;
  createdAt: string;
  // Calculado desde los valores crudos de arriba (ver lib/catalog.ts),
  // nunca guardado, para que jamás se desincronice.
  productCostGs: number;
  shippingCostGs: number;
  subtotalGs: number;
  taxGs: number;
  totalGs: number;
};

function rowToImportPurchase(row: ImportPurchaseRow): ImportPurchase {
  const calcInput: ImportCostInput = {
    costUsd: Number(row.cost_usd),
    exchangeRate: Number(row.exchange_rate),
    weightKg: Number(row.weight_kg),
    costPerKg: Number(row.cost_per_kg_snapshot),
    taxRate: Number(row.tax_rate),
  };

  return {
    id: row.id,
    productName: row.product_name,
    costUsd: calcInput.costUsd,
    exchangeRate: calcInput.exchangeRate,
    weightKg: calcInput.weightKg,
    courierId: row.courier_id,
    courierName: row.courier_name_snapshot,
    costPerKg: calcInput.costPerKg,
    taxRate: calcInput.taxRate,
    note: row.note,
    purchasedAt: row.purchased_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    productCostGs: calcInput.costUsd * calcInput.exchangeRate,
    shippingCostGs: calcInput.weightKg * calcInput.costPerKg,
    subtotalGs:
      calcInput.costUsd * calcInput.exchangeRate + calcInput.weightKg * calcInput.costPerKg,
    taxGs:
      (calcInput.costUsd * calcInput.exchangeRate + calcInput.weightKg * calcInput.costPerKg) *
      (calcInput.taxRate / 100),
    totalGs: importTotalGs(calcInput),
  };
}

export async function getImportPurchases(range?: {
  from?: string;
  to?: string;
}): Promise<ImportPurchase[]> {
  let query = supabaseAdmin
    .from("import_purchases")
    .select("*")
    .order("purchased_at", { ascending: false });

  if (range?.from) query = query.gte("purchased_at", range.from);
  if (range?.to) query = query.lte("purchased_at", range.to);

  const { data, error } = await query;
  if (error) fail(`No se pudieron cargar las importaciones: ${error.message}`);
  return (data as ImportPurchaseRow[]).map(rowToImportPurchase);
}

export type ImportPurchaseInput = {
  productName: string;
  costUsd: number;
  exchangeRate: number;
  weightKg: number;
  courierId: string;
  taxRate?: number;
  note?: string | null;
  purchasedAt?: string;
  adminName?: string | null;
};

async function assertValidImportPurchase(
  input: ImportPurchaseInput,
): Promise<ImportCourier> {
  if (!input.productName?.trim()) throw new DataError("El producto es obligatorio.");
  if (!Number.isFinite(input.costUsd) || input.costUsd < 0) {
    throw new DataError("El costo en dólares no es válido.");
  }
  if (!Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0) {
    throw new DataError("La cotización del dólar no es válida.");
  }
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
    throw new DataError("El peso debe ser mayor que 0.");
  }
  if (!input.courierId) throw new DataError("Selecciona un courier.");

  const couriers = await getImportCouriers();
  const courier = couriers.find((c) => c.id === input.courierId);
  if (!courier) throw new DataError("El courier elegido no existe.", 404);
  return courier;
}

export async function createImportPurchase(
  input: ImportPurchaseInput,
): Promise<ImportPurchase> {
  const courier = await assertValidImportPurchase(input);

  const id = `imp-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabaseAdmin
    .from("import_purchases")
    .insert({
      id,
      product_name: input.productName.trim(),
      cost_usd: input.costUsd,
      exchange_rate: input.exchangeRate,
      weight_kg: input.weightKg,
      courier_id: courier.id,
      courier_name_snapshot: courier.name,
      cost_per_kg_snapshot: courier.costPerKg,
      tax_rate: input.taxRate ?? 10,
      note: input.note?.trim() || null,
      purchased_at: input.purchasedAt ?? new Date().toISOString(),
      created_by: input.adminName ?? null,
    })
    .select("*")
    .single();

  if (error) fail(`No se pudo registrar la importación: ${error.message}`);
  return rowToImportPurchase(data as ImportPurchaseRow);
}

export async function updateImportPurchase(
  id: string,
  input: ImportPurchaseInput,
): Promise<ImportPurchase> {
  const courier = await assertValidImportPurchase(input);

  const { data, error } = await supabaseAdmin
    .from("import_purchases")
    .update({
      product_name: input.productName.trim(),
      cost_usd: input.costUsd,
      exchange_rate: input.exchangeRate,
      weight_kg: input.weightKg,
      courier_id: courier.id,
      courier_name_snapshot: courier.name,
      cost_per_kg_snapshot: courier.costPerKg,
      tax_rate: input.taxRate ?? 10,
      note: input.note?.trim() || null,
      purchased_at: input.purchasedAt ?? new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) fail(`No se pudo actualizar la importación: ${error.message}`);
  if (!data) throw new DataError("Importación no encontrada.", 404);
  return rowToImportPurchase(data as ImportPurchaseRow);
}

export async function deleteImportPurchase(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("import_purchases")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(`No se pudo eliminar la importación: ${error.message}`);
  if (!data || data.length === 0) {
    throw new DataError("Importación no encontrada.", 404);
  }
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

// ── Códigos QR rastreables ──────────────────────────────────────────────

type QrCampaignRow = {
  slug: string;
  name: string;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
};

export type QrCampaign = {
  slug: string;
  name: string;
  scanCount: number;
  lastScannedAt: string | null;
  createdAt: string;
};

function rowToQrCampaign(row: QrCampaignRow): QrCampaign {
  return {
    slug: row.slug,
    name: row.name,
    scanCount: row.scan_count,
    lastScannedAt: row.last_scanned_at,
    createdAt: row.created_at,
  };
}

export async function getAllQrCampaigns(): Promise<QrCampaign[]> {
  const { data, error } = await supabaseAdmin
    .from("qr_campaigns")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) fail(`No se pudieron cargar los códigos QR: ${error.message}`);
  return (data as QrCampaignRow[]).map(rowToQrCampaign);
}

export type QrCampaignInput = {
  slug: string;
  name: string;
};

function assertValidQrCampaign(input: QrCampaignInput) {
  if (!input.name?.trim()) throw new DataError("El nombre es obligatorio.");
  if (!/^[a-z0-9-]+$/.test(input.slug ?? "")) {
    throw new DataError(
      "El identificador solo puede tener minúsculas, números y guiones.",
    );
  }
}

export async function createQrCampaign(input: QrCampaignInput): Promise<QrCampaign> {
  assertValidQrCampaign(input);

  const { data, error } = await supabaseAdmin
    .from("qr_campaigns")
    .insert({ slug: input.slug.trim(), name: input.name.trim() })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new DataError("Ya existe un código QR con ese identificador.");
    }
    fail(`No se pudo crear el código QR: ${error.message}`);
  }
  return rowToQrCampaign(data as QrCampaignRow);
}

export async function deleteQrCampaign(slug: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("qr_campaigns")
    .delete()
    .eq("slug", slug)
    .select("slug");
  if (error) fail(`No se pudo eliminar el código QR: ${error.message}`);
  if (!data || data.length === 0) throw new DataError("Código QR no encontrado.", 404);
}

/** La llama /qr/[slug] al escanearse. Devuelve false si el slug no existe
 * (typo, o el código ya se borró) — la página redirige igual a la home. */
export async function recordQrScan(slug: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("increment_qr_scan", {
    p_slug: slug,
  });
  if (error) {
    console.error(`No se pudo registrar el escaneo de "${slug}":`, error.message);
    return false;
  }
  return Boolean(data);
}

// ── Catálogo de parches ─────────────────────────────────────────────────

export async function getAllPatches(): Promise<Patch[]> {
  const { data, error } = await supabaseAdmin
    .from("patches")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) fail(`No se pudieron cargar los parches: ${error.message}`);
  return (data as PatchRow[]).map(rowToPatch);
}

export type PatchInput = {
  name: string;
  image?: string | null;
  price: number;
  isVisible?: boolean;
};

function assertValidPatch(input: PatchInput) {
  if (!input.name?.trim()) throw new DataError("El nombre es obligatorio.");
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new DataError("El precio no es válido.");
  }
}

export async function createPatch(input: PatchInput): Promise<Patch> {
  assertValidPatch(input);

  const id = `patch-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabaseAdmin
    .from("patches")
    .insert({
      id,
      name: input.name.trim(),
      image: input.image ?? null,
      price: input.price,
      is_visible: input.isVisible ?? true,
    })
    .select("*")
    .single();

  if (error) fail(`No se pudo crear el parche: ${error.message}`);
  return rowToPatch(data as PatchRow);
}

export async function updatePatch(id: string, input: PatchInput): Promise<Patch> {
  assertValidPatch(input);

  const { data, error } = await supabaseAdmin
    .from("patches")
    .update({
      name: input.name.trim(),
      image: input.image ?? null,
      price: input.price,
      is_visible: input.isVisible ?? true,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) fail(`No se pudo actualizar el parche: ${error.message}`);
  if (!data) throw new DataError("Parche no encontrado.", 404);
  return rowToPatch(data as PatchRow);
}

export async function deletePatch(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("patches")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(`No se pudo eliminar el parche: ${error.message}`);
  if (!data || data.length === 0) throw new DataError("Parche no encontrado.", 404);
}

export { slugify };
