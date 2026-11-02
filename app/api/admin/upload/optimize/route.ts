import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import sharp from "sharp";
import convertHeic from "heic-convert";
import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "product-images";
const MAX_BYTES = 25 * 1024 * 1024;
const CONVERTIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);

// Variantes chicas generadas al lado del archivo "full" de siempre (mismo
// nombre + sufijo, ver lib/image.ts) — así las grillas/miniaturas/thumbnails
// de admin no piden el mismo archivo de hasta 2000px que la imagen grande.
const CARD_MAX = 640;
const THUMB_MAX = 160;
// Imagen principal de la ficha de producto (ProductDetail.tsx): mucha menos
// resolución que "full" (pensado para el feed de Meta y el zoom de parches),
// suficiente para el ancho real en que se muestra en pantalla.
const DETAIL_MAX = 1000;
// "full" ya no se usa como imagen principal de la ficha (eso pasó a
// "detail") -- hoy solo la consumen el feed de Meta, el zoom de un parche y
// un par de carruseles, ninguno necesita 2000px. Bajarla a 1400 corta a la
// mitad su peso sin pérdida visible ahí.
const FULL_MAX = 1400;

function isHeic(contentType: string, path: string) {
  return HEIC_MIME_TYPES.has(contentType) || /\.hei[cf]$/i.test(path);
}

/** Solo letras/números/guiones (mismo alfabeto que un slug) — nunca se
 * confía en el valor tal cual porque termina siendo parte de una ruta. */
function sanitizeFolder(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  return clean || null;
}

async function removeRaw(path: string) {
  await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {});
}

/** Sube una variante procesada y devuelve su URL pública. */
async function uploadVariant(
  path: string,
  payload: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, payload, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`No se pudo subir "${path}": ${error.message}`);
  return supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function POST(request: NextRequest) {
  let rawPath: string | undefined;
  let folder: string | null = null;

  try {
    const body = await request.json();
    rawPath = typeof body?.path === "string" ? body.path : undefined;
    folder = sanitizeFolder(body?.folder);
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!rawPath || !rawPath.startsWith("raw/")) {
    return NextResponse.json({ error: "Path de imagen inválido." }, { status: 400 });
  }

  try {
    const { data: downloaded, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(rawPath);
    if (downloadError || !downloaded) {
      return NextResponse.json(
        { error: "No se pudo leer el archivo recién subido." },
        { status: 400 },
      );
    }

    const contentType = downloaded.type || "";
    const input = Buffer.from(await downloaded.arrayBuffer());

    if (input.byteLength > MAX_BYTES) {
      await removeRaw(rawPath);
      return NextResponse.json(
        { error: "La imagen supera el tamaño máximo de 25 MB." },
        { status: 400 },
      );
    }

    const heic = isHeic(contentType, rawPath);
    let working: Buffer<ArrayBufferLike> = input;

    if (heic) {
      try {
        working = Buffer.from(
          await convertHeic({ buffer: working, format: "JPEG", quality: 0.92 }),
        );
      } catch {
        await removeRaw(rawPath);
        return NextResponse.json(
          {
            error:
              "No se pudo leer esta foto HEIC (puede estar dañada o ser un formato HEIC no estándar). Probá exportarla como JPG desde el iPhone.",
          },
          { status: 400 },
        );
      }
    }

    let payload: Buffer<ArrayBufferLike>;
    let outputExt: string;
    let outputContentType: string;
    // Solo se llenan cuando aplica (no para GIF fuera de rango, ver abajo) —
    // variantes chicas para grillas/miniaturas, derivadas del mismo buffer
    // ya rotado/decodificado, sin volver a descargar nada.
    let cardPayload: Buffer<ArrayBufferLike> | null = null;
    let thumbPayload: Buffer<ArrayBufferLike> | null = null;
    let detailPayload: Buffer<ArrayBufferLike> | null = null;

    if (heic || CONVERTIBLE_TYPES.has(contentType)) {
      const rotated = sharp(working).rotate();
      payload = await rotated
        .clone()
        .resize({
          width: FULL_MAX,
          height: FULL_MAX,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
      cardPayload = await rotated
        .clone()
        .resize({ width: CARD_MAX, height: CARD_MAX, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      thumbPayload = await rotated
        .clone()
        .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75, effort: 4 })
        .toBuffer();
      detailPayload = await rotated
        .clone()
        .resize({ width: DETAIL_MAX, height: DETAIL_MAX, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
      outputExt = ".webp";
      outputContentType = "image/webp";
    } else if (contentType === "image/gif") {
      // Se guarda tal cual (para no perder la animación al re-codificar),
      // pero se acotan las dimensiones para que un GIF armado a propósito
      // con un tamaño enorme no sea costoso de decodificar en el navegador.
      const { width, height } = await sharp(working, { animated: true }).metadata();
      if ((width ?? 0) > 3000 || (height ?? 0) > 3000) {
        await removeRaw(rawPath);
        return NextResponse.json(
          { error: "El GIF supera el tamaño máximo de 3000×3000 px." },
          { status: 400 },
        );
      }
      payload = working;
      outputExt = ".gif";
      outputContentType = contentType;
      // Las variantes chicas sí pueden perder la animación (se usa el
      // primer frame nomás) — nadie necesita una miniatura de 160px animada.
      cardPayload = await sharp(working)
        .resize({ width: CARD_MAX, height: CARD_MAX, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      thumbPayload = await sharp(working)
        .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75, effort: 4 })
        .toBuffer();
      detailPayload = await sharp(working)
        .resize({ width: DETAIL_MAX, height: DETAIL_MAX, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
    } else {
      await removeRaw(rawPath);
      return NextResponse.json(
        { error: "Formato no admitido. Usa PNG, JPG, WEBP, GIF o HEIC." },
        { status: 400 },
      );
    }

    const folderPath = folder ? `products/${folder}` : "products";
    // Mismo id para las 4 variantes — imageVariant() (lib/image.ts) arma la
    // URL de "-card"/"-thumb"/"-detail" insertando el sufijo antes de la
    // extensión, así que el nombre base tiene que coincidir exacto entre todas.
    const id = randomUUID();
    const uploads: Promise<string>[] = [
      uploadVariant(`${folderPath}/${id}${outputExt}`, payload, outputContentType),
    ];
    if (cardPayload) {
      uploads.push(uploadVariant(`${folderPath}/${id}-card.webp`, cardPayload, "image/webp"));
    }
    if (thumbPayload) {
      uploads.push(uploadVariant(`${folderPath}/${id}-thumb.webp`, thumbPayload, "image/webp"));
    }
    if (detailPayload) {
      uploads.push(uploadVariant(`${folderPath}/${id}-detail.webp`, detailPayload, "image/webp"));
    }
    const [finalUrl] = await Promise.all(uploads);

    // Fallo al limpiar el raw no debe tirar abajo una subida que ya
    // terminó bien (el archivo final ya está arriba) — antes esto caía al
    // catch general, devolvía 500, y el archivo final quedaba huérfano sin
    // que el cliente nunca recibiera su URL.
    await removeRaw(rawPath);

    return NextResponse.json(
      {
        url: finalUrl,
        format: outputExt.slice(1),
        optimized: outputExt === ".webp",
        originalBytes: input.byteLength,
        storedBytes: payload.byteLength,
      },
      { status: 201 },
    );
  } catch (err) {
    if (rawPath) await removeRaw(rawPath);
    console.error("Error procesando imagen subida:", err);
    return NextResponse.json(
      { error: "No se pudo procesar la imagen." },
      { status: 500 },
    );
  }
}
