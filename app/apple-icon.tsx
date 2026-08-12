import { ImageResponse } from "next/og";
import { getSetting } from "@/lib/data";
import { DEFAULT_BRANDING } from "@/lib/settings";

export const dynamic = "force-dynamic";
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
    const res = await fetch(faviconUrl, { cache: "no-store" });
    if (!res.ok) return fallbackIcon();
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/png",
      },
    });
  } catch {
    return fallbackIcon();
  }
}
