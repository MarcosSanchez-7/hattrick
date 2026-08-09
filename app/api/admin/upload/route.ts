import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

/**
 * Genera el token que permite al navegador subir el archivo ORIGINAL
 * directo a Vercel Blob, sin pasar por esta función — así una foto pesada
 * (HEIC de iPhone, 15-20 MB) no choca con el límite de tamaño de petición
 * de las funciones serverless (~4.5 MB). El procesado real (convertir,
 * redimensionar, comprimir) pasa después en /api/admin/upload/optimize,
 * a partir de la URL ya subida — eso sí puede manejar archivos grandes.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/*"],
        addRandomSuffix: true,
        maximumSizeInBytes: 25 * 1024 * 1024,
      }),
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el permiso de subida.",
      },
      { status: 400 },
    );
  }
}
