import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import sharp from "sharp";
import convertHeic from "heic-convert";

const MAX_BYTES = 25 * 1024 * 1024;
const CONVERTIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);

// Solo procesamos blobs que ya viven en nuestro propio store (los que
// acaban de subirse vía /api/admin/upload) — nunca una URL arbitraria que
// nos manden, para no convertir esto en un proxy de descargas.
const OWN_BLOB_HOST = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i;

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

    if (heic || CONVERTIBLE_TYPES.has(contentType)) {
      payload = await sharp(working)
        .rotate()
        .resize({
          width: 2000,
          height: 2000,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
      outputExt = ".webp";
      outputContentType = "image/webp";
    } else if (contentType === "image/gif" || contentType === "image/svg+xml") {
      payload = working;
      outputExt = contentType === "image/gif" ? ".gif" : ".svg";
      outputContentType = contentType;
    } else {
      await del(rawUrl);
      return NextResponse.json(
        { error: "Formato no admitido. Usa PNG, JPG, WEBP, GIF, SVG o HEIC." },
        { status: 400 },
      );
    }

    const folderPath = folder ? `products/${folder}` : "products";
    const finalBlob = await put(`${folderPath}/${randomUUID()}${outputExt}`, payload, {
      access: "public",
      contentType: outputContentType,
      addRandomSuffix: false,
    });

    await del(rawUrl);

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
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return NextResponse.json(
      { error: `No se pudo procesar la imagen: ${message}` },
      { status: 500 },
    );
  }
}
