// Anonimización de ubicaciones para el feed público. Crítico: address_zone de
// una búsqueda viene de Google Places con el negocio/calle en el PRIMER
// segmento ("Bonafide Villa Allende, El Dorado, Villa Allende, Córdoba,
// Argentina"). El feed es anónimo -> nunca debe revelar el negocio.
//
// coarseLocality deja solo la localidad (ciudad, provincia): descarta el país
// y, con dropFirst, el primer segmento (negocio/calle). Se usa dropFirst=true
// para búsquedas y false para zonas de candidato (que ya vienen a nivel ciudad).
export function coarseLocality(raw: string, dropFirst: boolean): string {
  let parts = (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => !/argentina/i.test(p));
  if (dropFirst && parts.length > 1) parts = parts.slice(1);
  return parts.slice(-2).join(", ");
}
