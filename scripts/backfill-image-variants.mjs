/**
 * Backfill único: genera las variantes "-card"/"-thumb" (ver lib/image.ts)
 * para todas las imágenes que ya estaban subidas antes de este cambio — sin
 * esto, apenas se despliegue el código que las pide, esas URLs responderían
 * 404 (las imágenes viejas solo tienen el archivo "full" de siempre).
 *
 * No toca la base de datos en absoluto: las URLs guardadas siguen siendo
 * las mismas de siempre; las variantes se derivan por nombre de archivo,
 * nunca se persisten aparte. Idempotente: si una variante ya existe, se
 * salta (se puede re-correr sin duplicar trabajo).
 *
 * Uso: node --env-file=.env.local scripts/backfill-image-variants.mjs
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
const CARD_MAX = 640;
const THUMB_MAX = 160;

function variantUrl(fullUrl, size) {
  const dot = fullUrl.lastIndexOf(".");
  // Mismo criterio que lib/image.ts: la variante siempre es .webp, incluso
  // si el "full" es un .gif (se guarda tal cual, sin recodificar).
  return `${fullUrl.slice(0, dot)}-${size}.webp`;
}

/** Recorre cualquier valor (string, array, objeto anidado) juntando URLs
 * del propio Blob — hace falta para site_settings, cuyo `value` es JSON de
 * forma libre (hero, branding, reviews, customBanner, etc.). */
function collectBlobUrls(value, out) {
  if (typeof value === "string") {
    if (OWN_BLOB_HOST.test(value)) out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectBlobUrls(v, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectBlobUrls(v, out);
  }
}

async function collectAllUrls() {
  const urls = new Set();

  const { data: products, error: pErr } = await supabase.from("products").select("images");
  if (pErr) throw new Error(`products: ${pErr.message}`);
  for (const p of products) collectBlobUrls(p.images, urls);

  const { data: patches, error: patErr } = await supabase.from("patches").select("images");
  if (patErr) throw new Error(`patches: ${patErr.message}`);
  for (const p of patches) collectBlobUrls(p.images, urls);

  const { data: categories, error: cErr } = await supabase.from("categories").select("image");
  if (cErr) throw new Error(`categories: ${cErr.message}`);
  for (const c of categories) collectBlobUrls(c.image, urls);

  const { data: settings, error: sErr } = await supabase.from("site_settings").select("value");
  if (sErr) throw new Error(`site_settings: ${sErr.message}`);
  for (const s of settings) collectBlobUrls(s.value, urls);

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
  const cardUrl = variantUrl(fullUrl, "card");
  const thumbUrl = variantUrl(fullUrl, "thumb");

  const [hasCard, hasThumb] = await Promise.all([
    variantExists(cardUrl),
    variantExists(thumbUrl),
  ]);
  if (hasCard && hasThumb) return "skipped";

  const res = await fetch(fullUrl);
  if (!res.ok) return `error: no se pudo descargar el original (${res.status})`;
  const buffer = Buffer.from(await res.arrayBuffer());
  const base = sharp(buffer);

  // Path relativo dentro del bucket (todo lo que sigue al host).
  const key = new URL(fullUrl).pathname.replace(/^\//, "");
  const dot = key.lastIndexOf(".");
  const keyBase = key.slice(0, dot);

  if (!hasCard) {
    const card = await base
      .clone()
      .resize({ width: CARD_MAX, height: CARD_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    await put(`${keyBase}-card.webp`, card, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
  }
  if (!hasThumb) {
    const thumb = await base
      .clone()
      .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75, effort: 4 })
      .toBuffer();
    await put(`${keyBase}-thumb.webp`, thumb, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
  }
  return "done";
}

async function main() {
  console.log("Juntando URLs de imagen (products, patches, categories, site_settings)...");
  const urls = await collectAllUrls();
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
