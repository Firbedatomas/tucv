import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Mismos colores que lib/theme/tokens.ts (tema "impacto") -- ImageResponse
// no puede leer variables CSS, así que van hardcodeados acá, igual que en
// app/icon.svg.
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          backgroundColor: "#FBF3E3",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              backgroundColor: "#FF4405",
              border: "4px solid #151515",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 34,
                height: 44,
                borderRadius: 6,
                backgroundColor: "#FBF3E3",
                border: "3px solid #151515",
                transform: "rotate(-8deg)",
              }}
            />
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, color: "#151515", display: "flex" }}>TuCV</div>
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: "#151515", maxWidth: 950, lineHeight: 1.15, display: "flex" }}>
          Cubrí puestos rápido con candidatos reales
        </div>
        <div style={{ fontSize: 28, color: "#6B6259", marginTop: 24, maxWidth: 900, display: "flex" }}>
          Candidatos de cercanía, sin CVs sueltos por mail. En Argentina.
        </div>
      </div>
    ),
    { ...size },
  );
}
