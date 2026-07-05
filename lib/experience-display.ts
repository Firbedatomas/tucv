import { CATEGORIES } from "@/lib/constants";

// Helpers de display del modelo laboral relacional (Fase 3B), compartidos por la
// card pública y el perfil público. Puramente presentacionales.

const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// "~4 años de experiencia" / "menos de 1 año". "" si no hay meses (el caller
// decide el fallback).
export function experienceYearsLabel(months?: number | null): string {
  if (!months || months <= 0) return "";
  if (months < 12) return "menos de 1 año de experiencia";
  const y = Math.round(months / 12);
  return `~${y} ${y === 1 ? "año" : "años"} de experiencia`;
}

// "Mar 2022 – Jul 2024" / "Mar 2022 – actualidad" / "2022 – 2024" (sin mes).
export function periodLabel(e: {
  start_year?: number | null;
  start_month?: number | null;
  end_year?: number | null;
  end_month?: number | null;
  currently_working?: boolean;
}): string {
  const fmt = (y?: number | null, m?: number | null) => (!y ? "" : m ? `${MONTHS_ES[m - 1]} ${y}` : `${y}`);
  const from = fmt(e.start_year, e.start_month);
  const to = e.currently_working ? "actualidad" : fmt(e.end_year, e.end_month);
  if (from && to) return `${from} – ${to}`;
  return from || to || "";
}

// Rubro: resuelve el slug (granular, ej "atencion") a su label; si es texto
// libre que no está en el catálogo, lo muestra tal cual.
export function categoryLabel(slug?: string): string {
  if (!slug) return "";
  const known = CATEGORIES.find((c) => c.value === slug);
  return known ? known.label : slug;
}

export function categoriesLabel(slugs?: string[] | null, max = 3): string {
  if (!slugs || slugs.length === 0) return "";
  return slugs.slice(0, max).map(categoryLabel).filter(Boolean).join(" · ");
}
