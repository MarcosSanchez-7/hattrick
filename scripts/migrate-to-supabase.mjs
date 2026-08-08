/**
 * Migración única: vuelca data/categories.json y data/products.json en Supabase.
 * Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local (la RLS bloquea la anon key).
 *
 * Uso:  node --env-file=.env.local scripts/migrate-to-supabase.mjs
 */
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function readJson(file) {
  const raw = await readFile(path.join(process.cwd(), "data", file), "utf-8");
  return JSON.parse(raw);
}

function toDbCategory(c) {
  return {
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    image: c.image ?? null,
  };
}

function toDbProduct(p) {
  return {
    id: p.id,
    slug: p.slug,
    team: p.team,
    name: p.name,
    category: p.category,
    league: p.league,
    season: p.season,
    price: p.price,
    compare_at: p.compareAt ?? null,
    is_new: Boolean(p.isNew),
    rating: p.rating,
    reviews: p.reviews,
    sizes: p.sizes ?? [],
    sold_out: p.soldOut ?? [],
    color_primary: p.colors.primary,
    color_secondary: p.colors.secondary,
    color_accent: p.colors.accent,
    pattern: p.pattern,
    description: p.description,
    tags: p.tags ?? [],
    images: p.images ?? [],
  };
}

async function main() {
  const categories = await readJson("categories.json");
  const products = await readJson("products.json");

  console.log(`Migrando ${categories.length} categorías...`);
  const { error: catError } = await supabase
    .from("categories")
    .upsert(categories.map(toDbCategory), { onConflict: "slug" });
  if (catError) throw catError;

  console.log(`Migrando ${products.length} productos...`);
  const { error: prodError } = await supabase
    .from("products")
    .upsert(products.map(toDbProduct), { onConflict: "id" });
  if (prodError) throw prodError;

  console.log("Listo. Categorías y productos migrados a Supabase.");
}

main().catch((err) => {
  console.error("Migración fallida:", err.message ?? err);
  process.exit(1);
});
