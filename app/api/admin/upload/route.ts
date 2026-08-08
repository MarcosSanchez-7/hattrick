import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

const MAX_BYTES = 5 * 1024 * 1024;

// Extensión derivada del MIME real, nunca del nombre de fichero del cliente.
const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

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

  const filename = `products/${randomUUID()}${ext}`;

  try {
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return NextResponse.json(
      { error: `No se pudo subir la imagen: ${message}` },
      { status: 500 },
    );
  }
}
