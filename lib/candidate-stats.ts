// Desglose de postulantes -- lógica pura compartida entre el dashboard admin
// (lib/admin/stats.ts) y el header de /empresa/candidatos (/api/candidate-counts).
//
// El problema que resuelve: el admin mostraba "Postulantes registrados" como el
// total crudo de la colección, mientras /empresa/candidatos solo lista a los que
// tienen consent_zone_visible. Ver 4 registrados y 2 visibles no es un bug, es
// que faltaban los estados intermedios. Estas dimensiones NO son una partición
// (un perfil oculto puede además estar incompleto): son ejes independientes.
//
// Hay DOS flags de visibilidad deliberados y separados:
//  - consent_zone_visible  -> aparece en /empresa/candidatos (búsqueda proactiva)
//  - consent_public_profile (+ profile_slug) -> aparece en el directorio público
//    /postulantes y tiene perfil /p/[slug]
// Un postulante puede tener uno, ambos o ninguno.

export type CandidateBreakdownInput = {
  consent_zone_visible: boolean;
  consent_public_profile: boolean;
  profile_slug: string;
  bio: string;
  categories: string[];
  availability: string[];
  experience: string;
};

export type CandidateBreakdown = {
  total: number;
  visiblesEmpresas: number;
  perfilPublico: number;
  incompletos: number;
  ocultos: number;
};

// Mismo criterio de "completo" que computeCandidateBadges (candidate-badges.ts):
// mantener sincronizado -- si cambia allá, cambia acá.
export function isCandidateComplete(c: CandidateBreakdownInput): boolean {
  return (
    Boolean(c.bio?.trim()) &&
    (c.categories?.length ?? 0) > 0 &&
    (c.availability?.length ?? 0) > 0 &&
    Boolean(c.experience)
  );
}

export function computeCandidateBreakdown(records: CandidateBreakdownInput[]): CandidateBreakdown {
  const breakdown: CandidateBreakdown = {
    total: records.length,
    visiblesEmpresas: 0,
    perfilPublico: 0,
    incompletos: 0,
    ocultos: 0,
  };
  for (const c of records) {
    if (c.consent_zone_visible) breakdown.visiblesEmpresas += 1;
    if (c.consent_public_profile && c.profile_slug) breakdown.perfilPublico += 1;
    if (!isCandidateComplete(c)) breakdown.incompletos += 1;
    if (!c.consent_zone_visible && !c.consent_public_profile) breakdown.ocultos += 1;
  }
  return breakdown;
}

// Campos mínimos a traer de PocketBase para calcular el desglose sin arrastrar
// datos sensibles (whatsapp, nombre, cv) que acá no hacen falta.
export const CANDIDATE_BREAKDOWN_FIELDS =
  "created,consent_zone_visible,consent_public_profile,profile_slug,bio,categories,availability,experience";
