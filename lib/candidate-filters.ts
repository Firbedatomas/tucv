// Nunca filtros por sexo o edad acá -- en CABA la Ley 6471 prohíbe que
// ofertas/búsquedas de personal (y las plataformas que las publican)
// restrinjan candidatos por edad, sexo o género salvo que sea imprescindible
// para el puesto, y a nivel nacional aplica también la Ley 23.592 contra
// actos discriminatorios. Nunca se vendió esto como feature del plan Pro y
// no se vuelve a agregar ni gratis ni pago -- lo que sí importa para elegir
// candidatos (rubro, zona, experiencia, disponibilidad, movilidad,
// referencias) ya está cubierto abajo.
export type CandidateFilters = {
  category: string;
  zone: string;
  experience: string;
  availability: string;
  hasReferences: boolean;
  hasOwnTransport: boolean;
  immediateAvailability: boolean;
};

export const emptyCandidateFilters: CandidateFilters = {
  category: "",
  zone: "",
  experience: "",
  availability: "",
  hasReferences: false,
  hasOwnTransport: false,
  immediateAvailability: false,
};

type FilterableCandidate = {
  categories?: string[];
  city_zone?: string;
  experience?: string;
  category_experience?: { category: string; experience: string }[] | null;
  availability?: string[];
  references?: (string | { name: string; relation: string; phone: string })[] | null;
  references_text?: string;
  has_own_transport?: string;
  immediate_availability?: boolean;
};

// Con experiencia cargada por rubro, "experiencia = X" solo tiene sentido
// atado a un rubro puntual. Si el filtro de rubro está seteado, exige esa
// combinación exacta; si no, alcanza con que CUALQUIER rubro del candidato
// tenga esa experiencia. Los perfiles viejos (sin category_experience)
// caen al campo `experience` general como respaldo.
function candidateHasExperience(candidate: FilterableCandidate, filters: CandidateFilters): boolean {
  if (!filters.experience) return true;
  const entries = candidate.category_experience;
  if (!entries || entries.length === 0) {
    return candidate.experience === filters.experience;
  }
  if (filters.category) {
    return entries.some((e) => e.category === filters.category && e.experience === filters.experience);
  }
  return entries.some((e) => e.experience === filters.experience);
}

function candidateHasReferences(candidate: FilterableCandidate): boolean {
  if (candidate.references && candidate.references.length > 0) return true;
  return Boolean(candidate.references_text?.trim());
}

export function matchesCandidateFilters(candidate: FilterableCandidate, filters: CandidateFilters): boolean {
  if (filters.category && !candidate.categories?.includes(filters.category)) return false;
  if (filters.zone && !candidate.city_zone?.toLowerCase().includes(filters.zone.toLowerCase())) {
    return false;
  }
  if (!candidateHasExperience(candidate, filters)) return false;
  if (filters.availability && !candidate.availability?.includes(filters.availability)) return false;
  if (filters.hasReferences && !candidateHasReferences(candidate)) return false;
  if (filters.hasOwnTransport && candidate.has_own_transport !== "si") return false;
  if (filters.immediateAvailability && !candidate.immediate_availability) return false;
  return true;
}
