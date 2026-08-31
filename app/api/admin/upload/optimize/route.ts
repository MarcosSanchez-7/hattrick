import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import sharp from "sharp";
import convertHeic from "heic-convert";
import { OWN_BLOB_HOST } from "@/lib/image";

const MAX_BYTES = 25 * 1024 * 1024;
const CONVERTIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);

// Variantes chicas generadas al lado del archivo "full" de siempre (mismo
// nombre + sufijo, ver lib/image.ts) — así las grillas/miniaturas/thumbnails
// de admin no piden el mismo archivo de hasta 2000px que la imagen grande.
const CARD_MAX = 640;
const THUMB_MAX = 160;

function isHeic(contentType: string, pathname: string) {
  return HEIC_MIME_TYPES.has(contentType) || /\.hei[cf]$/i.test(pathname);
}

/** Solo letras/números/guiones (mismo alfabeto que un slug) — nunca se
 * confía en el valor tal cual porque termina siendo parte de una ruta. */
function sanitizeFolder(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  return clean || null;
}

export async function POST(request: NextRequest) {
  let rawUrl: string | undefined;
  let folder: string | null = null;

  try {
    const body = await request.json();
    rawUrl = typeof body?.url === "string" ? body.url : undefined;
    folder = sanitizeFolder(body?.folder);
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!rawUrl || !OWN_BLOB_HOST.test(rawUrl)) {
    return NextResponse.json({ error: "URL de imagen inválida." }, { status: 400 });
  }

  try {
    const sourceRes = await fetch(rawUrl);
    if (!sourceRes.ok) {
      return NextResponse.json(
        { error: "No se pudo leer el archivo recién subido." },
        { status: 400 },
      );
    }

    const contentType = sourceRes.headers.get("content-type") ?? "";
    const pathname = new URL(rawUrl).pathname;
    const input = Buffer.from(await sourceRes.arrayBuffer());

    if (input.byteLength > MAX_BYTES) {
      await del(rawUrl);
      return NextResponse.json(
        { error: "La imagen supera el tamaño máximo de 25 MB." },
        { status: 400 },
      );
    }

    const heic = isHeic(contentType, pathname);
    let working: Buffer<ArrayBufferLike> = input;

    if (heic) {
      try {
        working = Buffer.from(
          await convertHeic({ buffer: working, format: "JPEG", quality: 0.92 }),
        );
      } catch {
        await del(rawUrl);
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

    if (heic || CONVERTIBLE_TYPES.has(contentType)) {
      const rotated = sharp(working).rotate();
      payload = await rotated
        .clone()
        .resize({
          width: 2000,
          height: 2000,
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
      outputExt = ".webp";
      outputContentType = "image/webp";
    } else if (contentType === "image/gif") {
      // Se guarda tal cual (para no perder la animación al re-codificar),
      // pero se acotan las dimensiones para que un GIF armado a propósito
      // con un tamaño enorme no sea costoso de decodificar en el navegador.
      const { width, height } = await sharp(working, { animated: true }).metadata();
      if ((width ?? 0) > 3000 || (height ?? 0) > 3000) {
        await del(rawUrl);
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
    } else {
      await del(rawUrl);
      return NextResponse.json(
        { error: "Formato no admitido. Usa PNG, JPG, WEBP, GIF o HEIC." },
        { status: 400 },
      );
    }

    const folderPath = folder ? `products/${folder}` : "products";
    // Mismo id para las 3 variantes — imageVariant() (lib/image.ts) arma la
    // URL de "-card"/"-thumb" insertando el sufijo antes de la extensión,
    // así que el nombre base tiene que coincidir exacto entre las tres.
    const id = randomUUID();
    const uploads: Promise<{ url: string }>[] = [
      put(`${folderPath}/${id}${outputExt}`, payload, {
        access: "public",
        contentType: outputContentType,
        addRandomSuffix: false,
      }),
    ];
    if (cardPayload) {
      uploads.push(
        put(`${folderPath}/${id}-card.webp`, cardPayload, {
          access: "public",
          contentType: "image/webp",
          addRandomSuffix: false,
        }),
      );
    }
    if (thumbPayload) {
      uploads.push(
        put(`${folderPath}/${id}-thumb.webp`, thumbPayload, {
          access: "public",
          contentType: "image/webp",
          addRandomSuffix: false,
        }),
      );
    }
    const [finalBlob] = await Promise.all(uploads);

    // Fallo al limpiar el raw no debe tirar abajo una subida que ya
    // terminó bien (el blob final ya está arriba) — antes esto caía al
    // catch general, devolvía 500, y el blob final quedaba huérfano sin
    // que el cliente nunca recibiera su URL.
    await del(rawUrl).catch(() => {});

    return NextResponse.json(
      {
        url: finalBlob.url,
        format: outputExt.slice(1),
        optimized: outputExt === ".webp",
        originalBytes: input.byteLength,
        storedBytes: payload.byteLength,
      },
      { status: 201 },
    );
  } catch (err) {
    if (rawUrl) await del(rawUrl).catch(() => {});
    console.error("Error procesando imagen subida:", err);
    return NextResponse.json(
      { error: "No se pudo procesar la imagen." },
      { status: 500 },
    );
  }
}
