// Helpers para las páginas locales (/trabajo/[city], /postulantes/[city]).
// El param `city` viaja como slug ("cordoba", "villa-allende") y hay que
// llevarlo a texto para (a) matchear contra los campos libres de zona
// (address_zone / city_zone, que NO están normalizados) por substring
// case-insensitive, y (b) mostrarlo bien escrito en títulos y CTAs.

// slug -> texto plano en minúsculas ("villa-allende" -> "villa allende").
// Sirve como needle para el match por substring contra la zona.
export function cityTextFromSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/-+/g, " ").trim().toLowerCase();
}

// Nombres que no se pueden reconstruir desde el slug, porque el slug perdió
// información: los acentos ("cordoba" -> "Córdoba") y las partículas que en
// español van en minúscula ("mar del plata" -> "Mar del Plata").
//
// Es una lista curada a propósito, no un algoritmo: no hay forma de saber si
// "cordoba" lleva tilde sin conocer la palabra. Se agregan localidades a
// medida que TuCV opera en ellas -- el fallback de abajo deja un título
// correcto aunque no esté en la lista, solo que sin acentos.
const NOMBRES: Record<string, string> = {
  // Córdoba (donde opera TuCV hoy)
  cordoba: "Córdoba",
  "villa-allende": "Villa Allende",
  "rio-cuarto": "Río Cuarto",
  "villa-carlos-paz": "Villa Carlos Paz",
  "san-francisco": "San Francisco",
  "villa-maria": "Villa María",
  "alta-gracia": "Alta Gracia",
  "jesus-maria": "Jesús María",
  "rio-tercero": "Río Tercero",
  "cruz-del-eje": "Cruz del Eje",
  "la-calera": "La Calera",
  unquillo: "Unquillo",
  "mendiolaza": "Mendiolaza",
  "saldan": "Saldán",
  // Principales del resto del país
  "buenos-aires": "Buenos Aires",
  "ciudad-de-buenos-aires": "Ciudad de Buenos Aires",
  "mar-del-plata": "Mar del Plata",
  "bahia-blanca": "Bahía Blanca",
  rosario: "Rosario",
  "santa-fe": "Santa Fe",
  parana: "Paraná",
  mendoza: "Mendoza",
  "san-rafael": "San Rafael",
  tucuman: "Tucumán",
  "san-miguel-de-tucuman": "San Miguel de Tucumán",
  salta: "Salta",
  jujuy: "Jujuy",
  "san-salvador-de-jujuy": "San Salvador de Jujuy",
  neuquen: "Neuquén",
  "rio-negro": "Río Negro",
  bariloche: "Bariloche",
  "san-carlos-de-bariloche": "San Carlos de Bariloche",
  "comodoro-rivadavia": "Comodoro Rivadavia",
  "la-plata": "La Plata",
  "mar-del-tuyu": "Mar del Tuyú",
  corrientes: "Corrientes",
  resistencia: "Resistencia",
  posadas: "Posadas",
  formosa: "Formosa",
  "santiago-del-estero": "Santiago del Estero",
  catamarca: "Catamarca",
  "la-rioja": "La Rioja",
  "san-juan": "San Juan",
  "san-luis": "San Luis",
  "santa-rosa": "Santa Rosa",
  ushuaia: "Ushuaia",
  "rio-gallegos": "Río Gallegos",
};

// Partículas que en español van en minúscula salvo al principio del nombre.
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "el"]);

// Title Case para español: "villa allende" -> "Villa Allende", pero
// "mar del plata" -> "Mar del Plata" (no "Mar Del Plata").
export function toTitleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && PARTICULAS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// slug -> nombre de ciudad presentable en una sola llamada.
export function cityLabelFromSlug(slug: string): string {
  const clave = decodeURIComponent(slug).trim().toLowerCase();
  const conocido = NOMBRES[clave];
  if (conocido) return conocido;
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
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
