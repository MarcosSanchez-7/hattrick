import sharp from "sharp";
import { ImageResponse } from "next/og";
import { getSetting } from "@/lib/data";
import { DEFAULT_BRANDING } from "@/lib/settings";

// Sin force-dynamic/no-store: se cachea (ver route segment config), el
// admin cambia el favicon con poca frecuencia y esto corría en CADA visita
// re-descargando el archivo completo desde Blob sin aprovechar nada de
// caché — contribuyó al consumo de Blob Data Transfer.
export const revalidate = 3600;
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

function fallbackIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          fontSize: 96,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        H
      </div>
    ),
    { ...size },
  );
}

export default async function AppleIcon() {
  const { faviconUrl } = await getSetting("branding", DEFAULT_BRANDING);
  if (!faviconUrl) return fallbackIcon();

  try {
    const res = await fetch(faviconUrl, { next: { revalidate: 3600 } });
    if (!res.ok) return fallbackIcon();
    // El archivo en Blob es el original subido por el admin (hasta
    // 2000x2000), no un ícono de 180x180 — sin este resize se transmitía
    // completo en cada visita disfrazado de apple-icon.
    const original = Buffer.from(await res.arrayBuffer());
    const resized = await sharp(original)
      .resize(size.width, size.height, { fit: "cover" })
      .png()
      .toBuffer();
    return new Response(resized, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return fallbackIcon();
  }
}
