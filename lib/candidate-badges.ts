// Insignias de un perfil de postulante -- lógica pura, compartida entre la
// card del directorio (PostulanteCard) y la página pública (/p/[slug]) para
// no calcular "qué badges mostrar" en dos lados distintos con criterios que
// se desincronizan.
//
// Nada de emoji (CLAUDE.md): la diferenciación es por color/forma. Tres
// tonos, con jerarquía deliberada -- no todos pesan igual:
//  - highlight: lo más accionable para un empleador (puede empezar ya) --
//    fondo de acento, el que más "salta".
//  - positive: señales de confianza (perfil completo, con experiencia) --
//    verde, presente pero secundario al highlight.
//  - neutral: dato útil pero de menor jerarquía (movilidad) -- bajo
//    contraste.
export type BadgeTone = "highlight" | "positive" | "neutral";
export type CandidateBadge = { label: string; tone: BadgeTone };

export type BadgeInput = {
  categories: string[];
  experience: string;
  availability: string[];
  bio: string;
  has_own_transport: string;
  immediate_availability: boolean;
};

export function computeCandidateBadges(c: BadgeInput): CandidateBadge[] {
  const badges: CandidateBadge[] = [];
  if (c.immediate_availability) badges.push({ label: "Puede empezar ya", tone: "highlight" });
  const complete =
    Boolean(c.bio?.trim()) && c.categories.length > 0 && c.availability.length > 0 && Boolean(c.experience);
  if (complete) badges.push({ label: "Perfil completo", tone: "positive" });
  if (c.experience && c.experience !== "sin_experiencia") badges.push({ label: "Con experiencia", tone: "positive" });
  if (c.has_own_transport === "si") badges.push({ label: "Movilidad propia", tone: "neutral" });
  return badges;
}

export const BADGE_TONE_STYLE: Record<BadgeTone, React.CSSProperties> = {
  highlight: { backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" },
  positive: { backgroundColor: "#DCFCE7", color: "#128C4A", border: "1.5px solid #128C4A" },
  neutral: { backgroundColor: "var(--tucv-bg)", color: "var(--tucv-muted)", border: "1.5px solid var(--tucv-border)" },
};
