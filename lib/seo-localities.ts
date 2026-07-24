// Extrae localidades reales de una zona escrita a mano / autocompletada por
// Google Places, para generar las páginas locales del sitemap
// (/trabajo/[city], /trabajo/[city]/[category], /postulantes/[city]).
//
// Por qué no se usa el campo `city` de job_posts: está sucio. Al 2026-07-24, de
// 4 búsquedas, una tenía city="Bonafide Villa Allende" (el nombre del NEGOCIO,
// que es lo que devolvió el autocompletado de Places) y otra lo tenía vacío.
// Publicar /trabajo/bonafide-villa-allende en el sitemap sería ofrecerle a
// Google una página titulada "Trabajo en Bonafide Villa Allende" -- ruido, y
// del que perjudica.
//
// El address_zone, en cambio, tiene forma aprovechable:
//   "El Dorado 68, Villa Allende, Córdoba, Argentina"
//    ^ calle/local    ^ localidad   ^ provincia  ^ país
// El primer componente es el ruido (calle o nombre del comercio) y el último
// el país. Lo del medio son localidades de verdad.

const PAISES = new Set(["argentina", "ar"]);

// Un componente que es solo números, o demasiado corto, no es una localidad.
function pareceLocalidad(texto: string): boolean {
  const t = texto.trim();
  if (t.length < 3) return false;
  if (!/[a-záéíóúüñ]/i.test(t)) return false;
  if (/^\d/.test(t)) return false;
  return true;
}

export function slugDeLocalidad(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Devuelve las localidades deducibles de una zona, de la más específica a la
 * más general (localidad, provincia).
 *
 * Conservador a propósito: ante la duda, devuelve menos. Una localidad de más
 * en el sitemap es una página basura ofrecida a Google; una de menos es una
 * oportunidad perdida, que se recupera sola cuando entre otra búsqueda con la
 * zona bien cargada.
 */
export function localidadesDeZona(zone: string): string[] {
  if (!zone) return [];
  const partes = zone
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Sin comas no se puede separar el ruido de la localidad ("GBA Sur" podría
  // ser cualquier cosa). Se descarta entera en vez de arriesgar.
  if (partes.length < 2) return [];

  // Fuera el primer componente (calle o nombre del comercio) y el país.
  const medio = partes.slice(1).filter((p) => !PAISES.has(slugDeLocalidad(p)));

  const vistos = new Set<string>();
  const out: string[] = [];
  for (const p of medio) {
    if (!pareceLocalidad(p)) continue;
    const slug = slugDeLocalidad(p);
    if (!slug || vistos.has(slug)) continue;
    vistos.add(slug);
    out.push(p.trim());
  }
  return out;
}
