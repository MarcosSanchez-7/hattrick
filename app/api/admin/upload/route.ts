import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import sharp from "sharp";
import convertHeic from "heic-convert";

const MAX_BYTES = 5 * 1024 * 1024;

// Extensión derivada del MIME real, nunca del nombre de fichero del cliente.
const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

const CONVERTIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// El navegador casi nunca manda el MIME real de un HEIC/HEIF (fotos de
// iPhone) — sobre todo al subir desde Windows — así que además del tipo
// miramos la extensión del nombre de fichero original.
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);
function isHeicFile(file: File) {
  return HEIC_MIME_TYPES.has(file.type) || /\.hei[cf]$/i.test(file.name);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se ha recibido ningún fichero." }, {
      status: 400,
    });
  }

  const heic = isHeicFile(file);
  const ext = heic ? ".heic" : EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato no admitido. Usa PNG, JPG, WEBP, GIF, SVG o HEIC (fotos de iPhone)." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera el tamaño máximo de 5 MB." },
      { status: 400 },
    );
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    let working: Buffer<ArrayBufferLike> = input;

    if (heic) {
      try {
        const jpeg = await convertHeic({ buffer: working, format: "JPEG", quality: 0.92 });
        working = Buffer.from(jpeg);
      } catch {
        return NextResponse.json(
          {
            error:
              "No se pudo leer esta foto HEIC (puede estar dañada o ser un formato HEIC no estándar). Probá exportarla como JPG desde el iPhone.",
          },
          { status: 400 },
        );
      }
    }

    let payload: Buffer<ArrayBufferLike> = working;
    let outputExt = ext;
    let contentType = file.type;

    if (heic || CONVERTIBLE_TYPES.has(file.type)) {
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
      contentType = "image/webp";
    }

    const filename = `products/${randomUUID()}${outputExt}`;
    const blob = await put(filename, payload, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return NextResponse.json(
      {
        url: blob.url,
        format: outputExt.slice(1),
        optimized: outputExt === ".webp",
        originalBytes: input.byteLength,
        storedBytes: payload.byteLength,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return NextResponse.json(
      { error: `No se pudo subir la imagen: ${message}` },
      { status: 500 },
    );
  }
}
