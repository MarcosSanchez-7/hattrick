/**
 * Migración única (Fase 7 de la migración Vercel -> Netlify): copia todos
 * los objetos de Vercel Blob a Supabase Storage (bucket "product-images"),
 * preservando el mismo pathname, y actualiza cada referencia en la base
 * (products.images, categories.image, patches.images, site_settings.value)
 * de la URL vieja a la nueva.
 *
 * NO borra nada de Vercel Blob -- queda como red de seguridad: si algo sale
 * mal alcanza con restaurar el backup de este mismo script (ver --apply)
 * para que el sitio siga funcionando igual que antes de correrlo.
 *
 * Uso:
 *   node --env-file=.env.local scripts/migrate-blob-to-supabase.mjs            (dry-run, no escribe nada)
 *   node --env-file=.env.local scripts/migrate-blob-to-supabase.mjs --apply    (copia + actualiza la base)
 */
import { createClient } from "@supabase/supabase-js";
import { list } from "@vercel/blob";
import { writeFile } from "fs/promises";

const APPLY = process.argv.includes("--apply");
const CONCURRENCY = 6;
const BUCKET = "product-images";
const OWN_BLOB_HOST = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
if (!blobToken) {
  console.error("Falta BLOB_READ_WRITE_TOKEN en .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function listAllBlobs() {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ cursor, limit: 1000, token: blobToken });
    blobs.push(...page.blobs);
    cursor = page.cursor;
  } while (cursor);
  return blobs;
}

async function withPool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: size }, worker));
  return results;
}

async function copyOne(blob) {
  const path = blob.pathname;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(blob.url);
      if (!res.ok) throw new Error(`descarga ${res.status}`);
      const contentType = res.headers.get("content-type") || "application/octet-stream";
      const buffer = Buffer.from(await res.arrayBuffer());
      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
        contentType,
        upsert: true,
      });
      if (error) throw new Error(error.message);
      const newUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      return { oldUrl: blob.url, path, newUrl, ok: true };
    } catch (err) {
      if (attempt === 3) return { oldUrl: blob.url, path, ok: false, error: err.message };
    }
  }
}

/** Mismo recorrido recursivo que scripts/backfill-image-variants.mjs, pero
 * para reemplazar en vez de solo recolectar: devuelve [valorNuevo, cambió]. */
function replaceBlobUrls(value, map) {
  if (typeof value === "string") {
    const replacement = map.get(value);
    return replacement ? [replacement, true] : [value, false];
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => {
      const [nv, c] = replaceBlobUrls(v, map);
      if (c) changed = true;
      return nv;
    });
    return [changed ? next : value, changed];
  }
  if (value && typeof value === "object") {
    let changed = false;
    const next = {};
    for (const [k, v] of Object.entries(value)) {
      const [nv, c] = replaceBlobUrls(v, map);
      next[k] = nv;
      if (c) changed = true;
    }
    return [changed ? next : value, changed];
  }
  return [value, false];
}

async function backupTable(name, rows) {
  const path = `scripts/.migrate-backup-${name}-${Date.now()}.json`;
  await writeFile(path, JSON.stringify(rows, null, 2), "utf8");
  console.log(`  backup escrito: ${path}`);
}

async function migrateTable({ table, pk, column }) {
  const { data: rows, error } = await supabase.from(table).select(`${pk}, ${column}`);
  if (error) throw new Error(`${table}: ${error.message}`);

  if (APPLY) await backupTable(table, rows);

  let updated = 0;
  for (const row of rows) {
    const [next, changed] = replaceBlobUrlsWrapper(row[column]);
    if (!changed) continue;
    updated += 1;
    if (APPLY) {
      const { error: updErr } = await supabase
        .from(table)
        .update({ [column]: next })
        .eq(pk, row[pk]);
      if (updErr) throw new Error(`${table}.${row[pk]}: ${updErr.message}`);
    }
  }
  console.log(`  ${table}.${column}: ${updated}/${rows.length} filas con URLs viejas${APPLY ? " (actualizadas)" : ""}`);
  return updated;
}

let urlMap;
function replaceBlobUrlsWrapper(value) {
  return replaceBlobUrls(value, urlMap);
}

async function countRemaining() {
  let remaining = 0;
  const tables = [
    { table: "products", pk: "id", column: "images" },
    { table: "categories", pk: "slug", column: "image" },
    { table: "patches", pk: "id", column: "images" },
    { table: "site_settings", pk: "key", column: "value" },
  ];
  for (const t of tables) {
    const { data: rows, error } = await supabase.from(t.table).select(`${t.pk}, ${t.column}`);
    if (error) throw new Error(`${t.table}: ${error.message}`);
    for (const row of rows) {
      const json = JSON.stringify(row[t.column]);
      if (json && OWN_BLOB_HOST.test(json.replace(/\\\//g, "/"))) remaining += 1;
    }
  }
  return remaining;
}

async function main() {
  console.log(APPLY ? "MODO APPLY -- esto va a escribir en Supabase Storage y en la base.\n" : "MODO DRY-RUN -- no se escribe nada.\n");

  console.log("Listando objetos de Vercel Blob...");
  const blobs = await listAllBlobs();
  console.log(`${blobs.length} objetos encontrados (${(blobs.reduce((s, b) => s + b.size, 0) / 1024 / 1024).toFixed(1)} MB).\n`);

  if (!APPLY) {
    console.log("Dry-run: no se copia nada ni se toca la base. Para ejecutar de verdad: --apply");
    return;
  }

  console.log(`Copiando a Supabase Storage (bucket "${BUCKET}", concurrencia ${CONCURRENCY})...`);
  let done = 0;
  const copyResults = await withPool(blobs, CONCURRENCY, async (blob) => {
    const r = await copyOne(blob);
    done += 1;
    if (done % 100 === 0 || done === blobs.length) {
      console.log(`  [${done}/${blobs.length}]`);
    }
    return r;
  });

  const failed = copyResults.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} objetos no se pudieron copiar. Abortando antes de tocar la base.`);
    for (const f of failed.slice(0, 20)) console.error(`  ERR ${f.path}: ${f.error}`);
    process.exit(1);
  }
  console.log("Copia completa, sin errores.\n");

  urlMap = new Map(copyResults.map((r) => [r.oldUrl, r.newUrl]));

  console.log("Actualizando referencias en la base...");
  await migrateTable({ table: "products", pk: "id", column: "images" });
  await migrateTable({ table: "categories", pk: "slug", column: "image" });
  await migrateTable({ table: "patches", pk: "id", column: "images" });
  await migrateTable({ table: "site_settings", pk: "key", column: "value" });

  console.log("\nVerificando que no queden URLs de Vercel Blob en la base...");
  const remaining = await countRemaining();
  if (remaining === 0) {
    console.log("OK: 0 filas con URLs de Vercel Blob restantes.");
  } else {
    console.error(`ADVERTENCIA: ${remaining} filas todavía referencian Vercel Blob (ver backups en scripts/ para revertir si hace falta).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
