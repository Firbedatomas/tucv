// Helpers para las páginas locales (/trabajo/[city], /postulantes/[city]).
// El param `city` viaja como slug ("cordoba", "villa-allende") y hay que
// llevarlo a texto para (a) matchear contra los campos libres de zona
// (address_zone / city_zone, que NO están normalizados) por substring
// case-insensitive, y (b) mostrarlo en Title Case en títulos y CTAs.

// slug -> texto plano en minúsculas ("villa-allende" -> "villa allende").
// Sirve como needle para el match por substring contra la zona.
export function cityTextFromSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/-+/g, " ").trim().toLowerCase();
}

// Title Case simple para español ("villa allende" -> "Villa Allende").
export function toTitleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// slug -> nombre de ciudad presentable en una sola llamada.
export function cityLabelFromSlug(slug: string): string {
  return toTitleCase(cityTextFromSlug(slug));
}

// Match laxo por substring: la zona la escribe el usuario a mano, así que
// "Córdoba Capital", "Bº Centro, Córdoba" y "cordoba" tienen que caer todas
// bajo el slug "cordoba". Comparación case-insensitive; ignora acentos para
// que "cordoba" matchee "Córdoba".
export function zoneMatchesCity(zone: string, cityText: string): boolean {
  if (!cityText) return true;
  return stripAccents(zone).toLowerCase().includes(stripAccents(cityText));
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
