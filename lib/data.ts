import "server-only";
import { randomUUID } from "crypto";
import type { Category, Product } from "@/lib/catalog";
import { slugify, uniqueSlug } from "@/lib/slug";
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
  team: string;
  name: string;
  category: string;
  league: string;
  season: string;
  price: number | string;
  compare_at: number | string | null;
  is_new: boolean;
  rating: number | string;
  reviews: number;
  sizes: string[] | null;
  sold_out: string[] | null;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  pattern: Product["pattern"];
  description: string;
  tags: string[] | null;
  images: string[] | null;
};

type CategoryRow = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string | null;
};

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    team: row.team,
    name: row.name,
    category: row.category,
    league: row.league,
    season: row.season,
    price: Number(row.price),
    compareAt: row.compare_at != null ? Number(row.compare_at) : null,
    isNew: row.is_new,
    rating: Number(row.rating),
    reviews: row.reviews,
    sizes: row.sizes ?? [],
    soldOut: row.sold_out ?? [],
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
  };
}

// ── Lecturas ────────────────────────────────────────────────────────────

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) fail(`No se pudieron cargar los productos: ${error.message}`);
  return (data as ProductRow[]).map(rowToProduct);
}

export async function getAllCategories(): Promise<Category[]> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) fail(`No se pudieron cargar las categorías: ${error.message}`);
  return (data as CategoryRow[]).map(rowToCategory);
}

// ── Productos ────────────────────────────────────────────────────────────

export type ProductInput = Omit<Product, "id" | "slug"> & { slug?: string };

function assertValidProduct(input: ProductInput) {
  if (!input.team?.trim()) throw new DataError("El equipo es obligatorio.");
  if (!input.name?.trim()) throw new DataError("El nombre es obligatorio.");
  if (!input.category?.trim()) throw new DataError("La categoría es obligatoria.");
  if (!input.league?.trim()) throw new DataError("La liga es obligatoria.");
  if (!input.season?.trim()) throw new DataError("La temporada es obligatoria.");
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new DataError("El precio debe ser un número mayor que 0.");
  }
  if (input.compareAt != null && input.compareAt <= input.price) {
    throw new DataError(
      "El precio anterior debe ser mayor que el precio actual.",
    );
  }
  if (!Array.isArray(input.sizes) || input.sizes.length === 0) {
    throw new DataError("Selecciona al menos una talla.");
  }
  if (!input.description?.trim()) {
    throw new DataError("La descripción es obligatoria.");
  }
}

function productToRow(input: ProductInput) {
  return {
    team: input.team,
    name: input.name,
    category: input.category,
    league: input.league,
    season: input.season,
    price: input.price,
    compare_at: input.compareAt ?? null,
    is_new: Boolean(input.isNew),
    rating: Number.isFinite(input.rating) ? input.rating : 5,
    reviews: Number.isFinite(input.reviews) ? input.reviews : 0,
    sizes: input.sizes,
    sold_out: input.soldOut ?? [],
    color_primary: input.colors.primary,
    color_secondary: input.colors.secondary,
    color_accent: input.colors.accent,
    pattern: input.pattern,
    description: input.description,
    tags: input.tags ?? [],
    images: input.images ?? [],
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
    : uniqueSlug(`${input.team}-${input.name}`, taken);

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({ id: `p-${randomUUID().slice(0, 8)}`, slug, ...productToRow(input) })
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      fail("La categoría seleccionada no existe.", 400);
    }
    fail(`No se pudo crear el producto: ${error.message}`);
  }
  return rowToProduct(data as ProductRow);
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

  const { data, error } = await supabaseAdmin
    .from("products")
    .update({ slug, ...productToRow(input) })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      fail("La categoría seleccionada no existe.", 400);
    }
    fail(`No se pudo actualizar el producto: ${error.message}`);
  }
  return rowToProduct(data as ProductRow);
}

export async function deleteProduct(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(`No se pudo eliminar el producto: ${error.message}`);
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

  const { data: existing, error: readError } = await supabaseAdmin
    .from("categories")
    .select("slug");
  if (readError) fail(`No se pudo comprobar el slug: ${readError.message}`);
  const taken = new Set((existing as { slug: string }[]).map((c) => c.slug));
  const slug = input.slug?.trim()
    ? uniqueSlug(input.slug, taken)
    : uniqueSlug(input.name, taken);

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({
      slug,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      image: input.image ?? null,
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

  // El slug es la clave usada por los productos: no se permite cambiarlo.
  const { data, error } = await supabaseAdmin
    .from("categories")
    .update({
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      image: input.image ?? null,
    })
    .eq("slug", slug)
    .select()
    .single();

  if (error) fail(`No se pudo actualizar la categoría: ${error.message}`);
  if (!data) throw new DataError("Categoría no encontrada.", 404);
  return rowToCategory(data as CategoryRow);
}

export async function deleteCategory(slug: string): Promise<void> {
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

export { slugify };
