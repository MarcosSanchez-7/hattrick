import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 120, fontWeight: 800, letterSpacing: -4 }}>
          HATTRICK
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#c6c6c6", marginTop: 16 }}>
          Camisetas de fútbol oficiales
        </div>
      </div>
    ),
    { ...size },
  );
}
