import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import sharp from "sharp";

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

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se ha recibido ningún fichero." }, {
      status: 400,
    });
  }

  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato no admitido. Usa PNG, JPG, WEBP, GIF o SVG." },
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
    let payload: Buffer<ArrayBufferLike> = input;
    let outputExt = ext;
    let contentType = file.type;

    if (CONVERTIBLE_TYPES.has(file.type)) {
      payload = await sharp(input)
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
