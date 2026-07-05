// Programas laborales: motor de compatibilidad entre un candidato y una
// búsqueda que acepta programas públicos de empleo (PPP, Empleo +26, PIL/EPT,
// Progresar). Lógica pura, testeable, sin dependencias de React ni PocketBase.
//
// REGLA LEGAL (ver lib/candidate-filters.ts): la ley prohíbe FILTRAR/EXCLUIR
// candidatos por edad. Este motor NUNCA excluye: solo etiqueta y ordena. Un
// candidato jamás desaparece de la lista por su edad -- a lo sumo aparece un
// badge o se lo promueve arriba.
//
// Precisión: la auto-declaración del candidato (programs_enrolled) es el dato
// DURO y pisa a la inferencia por edad. Las reglas de edad de cada programa
// son APROXIMADAS -- por eso la inferencia se rotula "posiblemente compatible"
// y siempre se acompaña del disclaimer de que la aprobación final depende del
// programa oficial vigente.

import { calculateAge } from "@/lib/age";
import type { CandidateBadge } from "@/lib/candidate-badges";

export type ProgramId = "ppp" | "empleo_26" | "pil_ept" | "progresar";
export type CompatibilityBasis = "declared" | "inferred";

export type EmploymentProgram = {
  id: ProgramId;
  label: string; // nombre completo, para el detalle
  shortLabel: string; // para chips/badges
  // Provincia a la que está acotado el programa (normalizada, sin acentos), o
  // null si es de alcance nacional.
  provinceScope: string | null;
  // Rango de edad aproximado del programa (null = sin límite por ese lado).
  minAge: number | null;
  maxAge: number | null;
};

// Catálogo. Reglas de edad aproximadas a 2026 -- deliberadamente conservadoras
// y rotuladas como "posiblemente" en la UI, no como certeza legal.
export const EMPLOYMENT_PROGRAMS: EmploymentProgram[] = [
  { id: "ppp", label: "Programa Primer Paso (PPP)", shortLabel: "PPP", provinceScope: "cordoba", minAge: 16, maxAge: 24 },
  { id: "empleo_26", label: "Empleo +26", shortLabel: "Empleo +26", provinceScope: "cordoba", minAge: 26, maxAge: null },
  { id: "pil_ept", label: "PIL / EPT (Nación)", shortLabel: "PIL / EPT", provinceScope: null, minAge: 18, maxAge: null },
  { id: "progresar", label: "Progresar", shortLabel: "Progresar", provinceScope: null, minAge: 16, maxAge: 24 },
];

const PROGRAM_BY_ID: Record<ProgramId, EmploymentProgram> = EMPLOYMENT_PROGRAMS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<ProgramId, EmploymentProgram>,
);

export function programById(id: ProgramId): EmploymentProgram {
  return PROGRAM_BY_ID[id];
}

// Normaliza una provincia a lowercase sin acentos para comparar
// ("Córdoba" -> "cordoba"). Mismo criterio que components/zonas/city.ts.
function normalizeProvince(province: string | null | undefined): string {
  return (province ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Programas que PODRÍAN aplicar en una zona. Nacional siempre; los
// provinciales solo si la provincia coincide. Sin provincia conocida (la
// empresa tipeó la zona a mano) degradamos a los nacionales -- nunca lista
// vacía por un dato geográfico ausente.
export function suggestProgramsForZone(province: string | null | undefined): ProgramId[] {
  const p = normalizeProvince(province);
  return EMPLOYMENT_PROGRAMS.filter((prog) => prog.provinceScope === null || prog.provinceScope === p).map(
    (prog) => prog.id,
  );
}

function ageWithin(program: EmploymentProgram, age: number | null): boolean {
  if (age === null) return false; // sin edad no se puede inferir (declarado sí sirve)
  if (program.minAge !== null && age < program.minAge) return false;
  if (program.maxAge !== null && age > program.maxAge) return false;
  return true;
}

function provinceMatches(program: EmploymentProgram, candidateProvince: string | null | undefined): boolean {
  if (program.provinceScope === null) return true; // nacional
  // Programa provincial: si no conocemos la provincia del candidato, no
  // inferimos (evita afirmar compatibilidad con un programa de otra provincia).
  const cp = normalizeProvince(candidateProvince);
  return cp !== "" && cp === program.provinceScope;
}

export type ProgramCandidate = {
  birth_date?: string | null;
  age_manual?: number | null;
  province?: string | null;
  work_situation?: string | null;
  programs_enrolled?: string[] | null;
};

export type ProgramMatch = { id: ProgramId; basis: CompatibilityBasis };
export type ProgramCompatibility = { compatible: boolean; programs: ProgramMatch[] };

// Compatibilidad de un candidato con los programas relevantes a la zona de la
// búsqueda. Declarado pisa inferido. NUNCA es base para excluir.
export function candidateProgramCompatibility(
  candidate: ProgramCandidate,
  opts: { province?: string | null } = {},
): ProgramCompatibility {
  const relevant = suggestProgramsForZone(opts.province);
  const declared = new Set((candidate.programs_enrolled ?? []).filter(Boolean));
  const age = calculateAge(candidate.birth_date, candidate.age_manual);

  const programs: ProgramMatch[] = [];
  for (const id of relevant) {
    const program = PROGRAM_BY_ID[id];
    if (declared.has(id)) {
      programs.push({ id, basis: "declared" }); // dato duro, gana siempre
      continue;
    }
    if (ageWithin(program, age) && provinceMatches(program, candidate.province)) {
      programs.push({ id, basis: "inferred" });
    }
  }
  return { compatible: programs.length > 0, programs };
}

// Badges para el panel de la empresa (tono del sistema de candidate-badges).
// Declarado -> highlight ("Inscripto en X", el más fuerte); inferido ->
// neutral ("Posiblemente compatible con X", bajo contraste).
export function programBadges(compatibility: ProgramCompatibility): CandidateBadge[] {
  return compatibility.programs.map((m) => {
    const program = PROGRAM_BY_ID[m.id];
    return m.basis === "declared"
      ? { label: `Inscripto en ${program.shortLabel}`, tone: "highlight" as const }
      : { label: `Posiblemente compatible con ${program.shortLabel}`, tone: "neutral" as const };
  });
}

// Texto legal que acompaña siempre a la capa de compatibilidad.
export const PROGRAMS_DISCLAIMER =
  "TuCV destaca postulantes que parezcan compatibles, pero la aprobación final depende del programa oficial vigente.";
