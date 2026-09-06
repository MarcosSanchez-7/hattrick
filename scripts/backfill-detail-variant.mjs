/**
 * Backfill único: genera la variante "-detail" (ver lib/image.ts) para las
 * imágenes de producto que ya estaban subidas antes de este cambio — sin
 * esto, ProductDetail.tsx pediría una URL "-detail.webp" que todavía no
 * existe para productos cargados antes de este backfill (404).
 *
 * Solo mira products.images: "-detail" únicamente lo pide la imagen
 * principal de la ficha de producto (ProductDetail.tsx) — patches,
 * categorías y site_settings nunca piden este tamaño (siguen usando
 * thumb/card/full como siempre, ver scripts/backfill-image-variants.mjs
 * para esas).
 *
 * No toca la base de datos en absoluto: las URLs guardadas siguen siendo
 * las mismas de siempre; la variante se deriva por nombre de archivo, nunca
 * se persiste aparte. Idempotente: si ya existe, se salta (se puede
 * re-correr sin duplicar trabajo).
 *
 * Uso: node --env-file=.env.local scripts/backfill-detail-variant.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { put } from "@vercel/blob";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Falta BLOB_READ_WRITE_TOKEN en .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const OWN_BLOB_HOST = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i;
const DETAIL_MAX = 1000;

function variantUrl(fullUrl, size) {
  const dot = fullUrl.lastIndexOf(".");
  // Mismo criterio que lib/image.ts: la variante siempre es .webp, incluso
  // si el "full" es un .gif (se guarda tal cual, sin recodificar).
  return `${fullUrl.slice(0, dot)}-${size}.webp`;
}

async function collectProductImageUrls() {
  const { data: products, error } = await supabase.from("products").select("images");
  if (error) throw new Error(`products: ${error.message}`);
  const urls = new Set();
  for (const p of products) {
    for (const img of p.images ?? []) {
      if (typeof img === "string" && OWN_BLOB_HOST.test(img)) urls.add(img);
    }
  }
  return urls;
}

async function variantExists(u) {
  try {
    const res = await fetch(u, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function backfillOne(fullUrl) {
  const detailUrl = variantUrl(fullUrl, "detail");
  if (await variantExists(detailUrl)) return "skipped";

  const res = await fetch(fullUrl);
  if (!res.ok) return `error: no se pudo descargar el original (${res.status})`;
  const buffer = Buffer.from(await res.arrayBuffer());

  const key = new URL(fullUrl).pathname.replace(/^\//, "");
  const dot = key.lastIndexOf(".");
  const keyBase = key.slice(0, dot);

  const detail = await sharp(buffer, { animated: false })
    .resize({ width: DETAIL_MAX, height: DETAIL_MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  await put(`${keyBase}-detail.webp`, detail, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
  });
  return "done";
}

async function main() {
  console.log("Juntando URLs de imagen de productos...");
  const urls = await collectProductImageUrls();
  console.log(`${urls.size} imágenes únicas encontradas.\n`);

  let done = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  let i = 0;
  for (const u of urls) {
    i += 1;
    try {
      const result = await backfillOne(u);
      if (result === "done") {
        done += 1;
        console.log(`[${i}/${urls.size}] OK  ${u}`);
      } else if (result === "skipped") {
        skipped += 1;
        console.log(`[${i}/${urls.size}] --  ${u} (ya existía)`);
      } else {
        failed += 1;
        failures.push({ url: u, reason: result });
        console.log(`[${i}/${urls.size}] ERR ${u} -> ${result}`);
      }
    } catch (err) {
      failed += 1;
      failures.push({ url: u, reason: err.message });
      console.log(`[${i}/${urls.size}] ERR ${u} -> ${err.message}`);
    }
  }

  console.log(`\nListo: ${done} procesadas, ${skipped} ya existían, ${failed} fallaron.`);
  if (failures.length > 0) {
    console.log("\nSe puede volver a correr el script para reintentar solo las fallidas (es idempotente).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
