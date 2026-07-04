import { CATEGORIES, EXPERIENCE, AVAILABILITY, labelFor, labelsFor } from "@/lib/constants";
import type { PublicCandidateListItem } from "@/lib/public-candidates-list";

// Mismos colores que lib/theme/tokens.ts (tema "impacto"), hardcodeados acá
// porque ImageResponse (Satori) no puede leer variables CSS `var(--tucv-*)`
// -- ver el mismo comentario en lib/job-share-card.tsx.
const COLORS = {
  bg: "#FBF3E3",
  text: "#151515",
  muted: "#6B6259",
  primary: "#FF4405",
  surface: "#FFFFFF",
};

// Mismo isotipo que lib/job-share-card.tsx (TuCVMark) -- reimplementado acá
// en vez de importado porque Satori no comparte fácilmente JSX entre
// módulos con estilos por variable; se mantiene igual a propósito.
function TuCVMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundColor: COLORS.primary,
        border: `${Math.round(size * 0.07)}px solid ${COLORS.text}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: size * 0.46,
          height: size * 0.6,
          borderRadius: size * 0.09,
          backgroundColor: COLORS.bg,
          border: `${Math.max(2, Math.round(size * 0.045))}px solid ${COLORS.text}`,
          transform: "rotate(-8deg)",
          display: "flex",
        }}
      />
    </div>
  );
}

function Chip({ children, solid, scale }: { children: string; solid?: boolean; scale: number }) {
  return (
    <div
      style={{
        display: "flex",
        padding: `${10 * scale}px ${20 * scale}px`,
        borderRadius: 14 * scale,
        border: `3px solid ${COLORS.text}`,
        backgroundColor: solid ? COLORS.primary : "transparent",
        color: solid ? COLORS.surface : COLORS.text,
        fontWeight: 800,
        fontSize: (solid ? 32 : 26) * scale,
      }}
    >
      {children}
    </div>
  );
}

// Tarjeta para compartir un perfil de postulante, usada por next/og
// ImageResponse -- mismo patrón que JobShareCard (lib/job-share-card.tsx).
// A propósito NUNCA incluye whatsapp/fecha de nacimiento/cv: esta imagen
// queda cacheada por rastreadores de WhatsApp/X/Discord al pegar el link,
// mucho más expuesta que la propia página (ver nota en
// lib/public-candidates-list.ts, getPublicCandidateCard).
export function CandidateShareCard({
  candidate,
  url,
  variant,
}: {
  candidate: PublicCandidateListItem;
  url: string;
  variant: "landscape" | "portrait";
}) {
  const isPortrait = variant === "portrait";
  const scale = isPortrait ? 1.25 : 1;
  const category = candidate.categories[0] ? labelFor(CATEGORIES, candidate.categories[0]) : "";
  const experience = candidate.experience ? labelFor(EXPERIENCE, candidate.experience) : "";
  const availability = labelsFor(AVAILABILITY, candidate.availability).slice(0, 2).join(" · ");
  const displayUrl = url.replace(/^https?:\/\//, "");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.bg,
        padding: isPortrait ? 88 : 72,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: isPortrait ? "center" : "flex-start",
        }}
      >
        <div style={{ fontSize: 30 * scale, fontWeight: 700, color: COLORS.muted, display: "flex" }}>
          Busca laburo{candidate.city_zone ? ` en ${candidate.city_zone}` : ""}
        </div>
        <div
          style={{
            fontSize: 68 * scale,
            fontWeight: 800,
            color: COLORS.text,
            lineHeight: 1.1,
            marginTop: 12,
            maxWidth: isPortrait ? 880 : 1000,
            display: "flex",
          }}
        >
          {candidate.displayName}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 * scale, marginTop: 40 * scale }}>
          {category && (
            <Chip solid scale={scale}>
              {category}
            </Chip>
          )}
          {experience && <Chip scale={scale}>{experience}</Chip>}
          {availability && <Chip scale={scale}>{availability}</Chip>}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          paddingTop: 32,
          borderTop: `2px solid ${COLORS.text}`,
        }}
      >
        <TuCVMark size={56 * scale} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 34 * scale, fontWeight: 800, color: COLORS.primary, display: "flex" }}>
            Ver perfil →
          </div>
          <div style={{ fontSize: 22 * scale, fontWeight: 600, color: COLORS.muted, display: "flex" }}>{displayUrl}</div>
        </div>
      </div>
    </div>
  );
}
