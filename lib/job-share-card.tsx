import { HARD_REQUIREMENTS, AVAILABILITY, labelsFor, taskSuggestionsFor } from "@/lib/constants";
import { salaryText } from "@/lib/job-display";
import type { PublicJob } from "@/lib/public-job";

// Mismos colores que lib/theme/tokens.ts (tema "impacto"), ya hardcodeados
// también en app/opengraph-image.tsx y lib/job-flyer.ts -- ImageResponse
// (Satori) no puede leer variables CSS `var(--tucv-*)`.
const COLORS = {
  bg: "#FBF3E3",
  text: "#151515",
  muted: "#6B6259",
  primary: "#FF4405",
  surface: "#FFFFFF",
  // Mismo verde que el badge "Activa" en components/public-job/PublicJobClient.tsx
  // y lib/job-post-status.ts (statusBadgeStyle) -- no inventar un verde nuevo acá.
  activeBg: "#DCFCE7",
  activeText: "#128C4A",
};

// Mismo isotipo que components/ui/Logo.tsx (LogoMark), reimplementado con
// divs en vez de <svg>/paths -- mismo approach ya probado en
// app/opengraph-image.tsx, sin el check interno (a este tamaño no se lee y
// Satori renderiza paths curvos de forma poco confiable).
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

// Chip "solid" (salario) es el único con fondo lleno -- es el dato con más
// jerarquía después del puesto. Zona/turno van en outline: mismo peso entre
// sí, menor contraste que el salario (CLAUDE.md: no todos los chips con el
// mismo tratamiento).
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

// "Tareas:"/"Requisitos:" -- mismo criterio que ChipRow en PublicJobClient.tsx
// (label chico y de menor contraste, valor con más peso), no un par
// label/value suelto porque acá el valor es una lista, no hay forma más
// natural de introducirla.
function InfoLine({ label, value, scale }: { label: string; value: string; scale: number }) {
  return (
    <div style={{ display: "flex", fontSize: 24 * scale, marginTop: 12 * scale, maxWidth: 1000 }}>
      <span style={{ fontWeight: 700, color: COLORS.muted, marginRight: 8, display: "flex" }}>{label}:</span>
      <span style={{ fontWeight: 600, color: COLORS.text, display: "flex" }}>{value}</span>
    </div>
  );
}

function ActiveBadge({ scale }: { scale: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: `${6 * scale}px ${16 * scale}px`,
        borderRadius: 999,
        border: `2px solid ${COLORS.activeText}`,
        backgroundColor: COLORS.activeBg,
        color: COLORS.activeText,
        fontWeight: 700,
        fontSize: 22 * scale,
        whiteSpace: "nowrap",
      }}
    >
      Búsqueda activa
    </div>
  );
}

// Tarjeta para compartir una búsqueda, usada por next/og ImageResponse.
// "landscape" (1200x630) alimenta el og:image/Twitter Card de la página
// (la ve X, WhatsApp, etc. al pegar el link); "portrait" (1080x1350) es la
// que se adjunta como archivo real vía Web Share API para Instagram, que no
// tiene link unfurling.
export function JobShareCard({
  job,
  url,
  variant,
}: {
  job: PublicJob;
  url: string;
  variant: "landscape" | "portrait";
}) {
  const isPortrait = variant === "portrait";
  const scale = isPortrait ? 1.25 : 1;
  const salary = salaryText(job);
  const turno = labelsFor(AVAILABILITY, job.shift).slice(0, 2).join(" · ");
  const tasks = labelsFor(taskSuggestionsFor(job.category), job.main_tasks).slice(0, 3).join(", ");
  const requirements = labelsFor(HARD_REQUIREMENTS, job.hard_requirements).slice(0, 2).join(", ");
  const displayUrl = url.replace(/^https?:\/\//, "");
  const logoSize = 72 * scale;

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
      {/* flex:1 empuja el footer al fondo -- en portrait además centra el
          bloque principal en el alto sobrante, así no queda un vacío
          "roto" entre las chips y el footer (mucho más alto que landscape). */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: isPortrait ? "center" : "flex-start",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo del negocio en vez del nombre en texto, si tiene -- pedido
              explícito: no mostrar los dos, el logo ya identifica al negocio. */}
          {job.business_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori (next/og) no soporta next/image, necesita <img> nativo.
            <img
              src={job.business_logo_url}
              width={logoSize}
              height={logoSize}
              style={{
                width: logoSize,
                height: logoSize,
                borderRadius: logoSize * 0.22,
                border: `3px solid ${COLORS.text}`,
                objectFit: "cover",
                backgroundColor: COLORS.surface,
              }}
            />
          ) : (
            <div style={{ fontSize: 30 * scale, fontWeight: 700, color: COLORS.muted, display: "flex" }}>
              {job.business_name}
            </div>
          )}
          {job.active && <ActiveBadge scale={scale} />}
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
          {job.role || job.name}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 * scale, marginTop: 40 * scale }}>
          {salary && (
            <Chip solid scale={scale}>
              {salary}
            </Chip>
          )}
          {job.address_zone && <Chip scale={scale}>{job.address_zone}</Chip>}
          {turno && <Chip scale={scale}>{turno}</Chip>}
        </div>

        {tasks && <InfoLine label="Tareas" value={tasks} scale={scale} />}
        {requirements && <InfoLine label="Requisitos" value={requirements} scale={scale} />}
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
            Postulate ahora →
          </div>
          <div style={{ fontSize: 22 * scale, fontWeight: 600, color: COLORS.muted, display: "flex" }}>
            {displayUrl}
          </div>
        </div>
      </div>
    </div>
  );
}
