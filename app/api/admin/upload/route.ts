import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "product-images";

// Sin image/svg+xml a propósito: un SVG puede llevar <script> embebido —
// ver app/api/admin/upload/optimize/route.ts, que ya no lo acepta tampoco.
// El catálogo son fotos, no vectores.
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

function extensionFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

/**
 * Emite un permiso de subida firmado (válido 2 h) para que el navegador
 * suba el archivo ORIGINAL directo a Supabase Storage, sin pasar por esta
 * función — así una foto pesada (HEIC de iPhone, 15-20 MB) no choca con el
 * límite de tamaño de body de las funciones serverless. El procesado real
 * (convertir, redimensionar, comprimir) pasa después en
 * /api/admin/upload/optimize, a partir del path ya subido — eso sí puede
 * manejar archivos grandes porque los lee del Storage, no del body del
 * request. El límite de 25 MB se aplica solo, a nivel de bucket (ver
 * file_size_limit en la migración que crea "product-images").
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Formato no admitido." }, { status: 400 });
  }

  // Prefijo "raw/" a propósito: si esto queda huérfano (el usuario cierra
  // la pestaña, o falla la red, entre esta subida y la llamada a /optimize
  // de abajo), queda identificable y barrible por prefijo en vez de
  // mezclado con el resto de los archivos.
  const ext = extensionFromFilename(filename) || ".bin";
  const path = `raw/${randomUUID()}${ext}`;

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo generar el permiso de subida." },
      { status: 400 },
    );
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
