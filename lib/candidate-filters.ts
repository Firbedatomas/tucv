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
  // Grupo de rubros (chip rápido tipo "Gastronomía" = cocina/moza-o/barista...).
  // Opcional y aditivo: si está seteado, el candidato pasa si tiene ALGUNO de
  // esos rubros. No afecta a los callers que no lo usan (undefined = sin efecto).
  categoryAny?: string[];
  zone: string;
  experience: string;
  availability: string;
  hasReferences: boolean;
  hasOwnTransport: boolean;
  immediateAvailability: boolean;
  // Última actividad del perfil: timestamp en ms; 0 = sin filtro. El caller
  // calcula el corte (Date.now() - ventana) en un event handler, nunca en render.
  lastActivitySince: number;
  // Programas laborales: a diferencia de todos los demás, este NO excluye. Es
  // un toggle que PROMUEVE a los compatibles arriba (la reordenación vive en
  // ApplicantsPanel, no acá) -- por eso matchesCandidateFilters lo ignora a
  // propósito. Excluir por compatibilidad reintroduciría el filtro por edad
  // que la nota de arriba prohíbe.
  programsCompatible: boolean;
};

export const emptyCandidateFilters: CandidateFilters = {
  category: "",
  zone: "",
  experience: "",
  availability: "",
  hasReferences: false,
  hasOwnTransport: false,
  immediateAvailability: false,
  lastActivitySince: 0,
  programsCompatible: false,
};

type FilterableCandidate = {
  categories?: string[];
  city_zone?: string;
  city?: string;
  province?: string;
  country?: string;
  experience?: string;
  category_experience?: { category: string; experience: string }[] | null;
  availability?: string[];
  references?: (string | { name: string; relation: string; phone: string })[] | null;
  references_text?: string;
  has_own_transport?: string;
  immediate_availability?: boolean;
  updated?: string;
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
  if (
    filters.categoryAny &&
    filters.categoryAny.length > 0 &&
    !filters.categoryAny.some((c) => candidate.categories?.includes(c))
  ) {
    return false;
  }
  if (filters.zone && !candidate.city_zone?.toLowerCase().includes(filters.zone.toLowerCase())) {
    return false;
  }
  if (!candidateHasExperience(candidate, filters)) return false;
  if (filters.availability && !candidate.availability?.includes(filters.availability)) return false;
  if (filters.hasReferences && !candidateHasReferences(candidate)) return false;
  if (filters.hasOwnTransport && candidate.has_own_transport !== "si") return false;
  if (filters.immediateAvailability && !candidate.immediate_availability) return false;
  // Última actividad: si hay corte activo, el perfil pasa solo si su `updated`
  // es igual o posterior. Un candidato sin `updated` (o con fecha inválida) NO
  // pasa cuando el filtro está activo: no podemos garantizar que estuvo activo
  // en la ventana pedida, así que lo excluimos en vez de mostrarlo de más.
  if (filters.lastActivitySince > 0) {
    if (!candidate.updated) return false;
    const updatedMs = new Date(candidate.updated).getTime();
    if (Number.isNaN(updatedMs) || updatedMs < filters.lastActivitySince) return false;
  }
  return true;
}

export type ZoneTier = "city" | "province" | "country";

// Default de zona antes de que la empresa toque el filtro a mano: primero
// candidatos de su misma ciudad; si no hay ninguno, de su misma provincia;
// si tampoco, no restringe (país completo) -- nunca una lista vacía por un
// default de zona demasiado angosto. Solo aplica cuando city/province vienen
// de un lugar real elegido en el autocomplete (ver AddressAutocomplete,
// onSelectDetails) -- si el negocio tipeó la zona a mano, cae directo a
// "country" (sin restricción), que es el comportamiento actual sin cambios.
export function narrowByZoneCascade<T extends FilterableCandidate>(
  candidates: T[],
  businessCity: string,
  businessProvince: string,
): { candidates: T[]; tier: ZoneTier } {
  if (businessCity) {
    const inCity = candidates.filter((c) => c.city && c.city.toLowerCase() === businessCity.toLowerCase());
    if (inCity.length > 0) return { candidates: inCity, tier: "city" };
  }
  if (businessProvince) {
    const inProvince = candidates.filter(
      (c) => c.province && c.province.toLowerCase() === businessProvince.toLowerCase(),
    );
    if (inProvince.length > 0) return { candidates: inProvince, tier: "province" };
  }
  return { candidates, tier: "country" };
}
