// Captura de comercios desde OpenStreetMap (Overpass API).
//
// Alternativa GRATIS a Google Places. La comparación medida en Córdoba capital
// el 2026-07-25, sobre 1665 comercios con nombre:
//
//                    OSM        Places
//   email directo     3%          0%   <- Places NO tiene el campo
//   website           8%         68%
//   teléfono         15%         83%
//   costo          gratis       por request
//
// O sea: OSM cubre mucho menos, pero es lo único que trae el email servido y
// no cuesta nada. Se usan las dos como fuentes complementarias.
//
// Overpass es infraestructura donada por la comunidad: una consulta por ciudad,
// espaciadas, y con User-Agent identificable. No es una API para martillar.

export type ZonaOsm = { nombre: string; bbox: [number, number, number, number] };

// bbox = [sur, oeste, norte, este]. Recortados a la mancha urbana: una bbox
// muy grande hace que Overpass devuelva timeout (pasó con la primera prueba).
export const ZONAS_OSM: readonly ZonaOsm[] = [
  { nombre: "Córdoba", bbox: [-31.5, -64.3, -31.32, -64.1] },
  { nombre: "CABA", bbox: [-34.71, -58.53, -34.53, -58.34] },
  { nombre: "Rosario", bbox: [-33.03, -60.75, -32.85, -60.6] },
  { nombre: "La Plata", bbox: [-34.98, -58.03, -34.86, -57.89] },
  { nombre: "Mar del Plata", bbox: [-38.08, -57.65, -37.9, -57.5] },
  { nombre: "Mendoza", bbox: [-32.95, -68.9, -32.83, -68.78] },
  { nombre: "Tucumán", bbox: [-26.87, -65.25, -26.77, -65.15] },
  { nombre: "Salta", bbox: [-24.83, -65.45, -24.72, -65.36] },
  { nombre: "Santa Fe", bbox: [-31.68, -60.75, -31.56, -60.65] },
  { nombre: "Neuquén", bbox: [-38.98, -68.11, -38.9, -68.0] },
  { nombre: "Villa Allende", bbox: [-31.32, -64.32, -31.26, -64.26] },
  { nombre: "Río Cuarto", bbox: [-33.16, -64.38, -33.08, -64.3] },
];

// Rubros de OSM que corresponden a comercio local con rotación de personal.
// Se excluyen a propósito los que no contratan (cajeros automáticos, etc.).
const SHOPS = [
  "bakery", "butcher", "greengrocer", "convenience", "supermarket", "kiosk",
  "hairdresser", "beauty", "clothes", "shoes", "hardware", "florist",
  "pet", "optician", "books", "stationery", "bicycle", "car_repair",
  "laundry", "dry_cleaning", "furniture", "paint", "garden_centre",
];
const AMENITIES = ["restaurant", "cafe", "bar", "fast_food", "pharmacy", "ice_cream", "veterinary"];

export function consultaOverpass(bbox: readonly [number, number, number, number]): string {
  const b = bbox.join(",");
  return `[out:json][timeout:120];
(
  node["shop"~"^(${SHOPS.join("|")})$"](${b});
  node["amenity"~"^(${AMENITIES.join("|")})$"](${b});
);
out tags;`;
}

export type ElementoOsm = {
  id?: number;
  type?: string;
  tags?: Record<string, string>;
};

export type NegocioOsm = {
  osmId: string;
  nombre: string;
  rubro: string;
  email: string;
  telefono: string;
  website: string;
  direccion: string;
};

const RUBRO_POR_TAG: Record<string, string> = {
  bakery: "Gastronomía",
  restaurant: "Gastronomía",
  cafe: "Gastronomía",
  bar: "Gastronomía",
  fast_food: "Gastronomía",
  ice_cream: "Gastronomía",
  butcher: "Comercio",
  greengrocer: "Comercio",
  convenience: "Comercio",
  supermarket: "Comercio",
  kiosk: "Comercio",
  clothes: "Comercio",
  shoes: "Comercio",
  hardware: "Comercio",
  florist: "Comercio",
  books: "Comercio",
  stationery: "Comercio",
  furniture: "Comercio",
  paint: "Comercio",
  garden_centre: "Comercio",
  pet: "Comercio",
  hairdresser: "Belleza / estética",
  beauty: "Belleza / estética",
  pharmacy: "Salud",
  optician: "Salud",
  veterinary: "Salud",
  bicycle: "Servicios",
  car_repair: "Servicios",
  laundry: "Servicios",
  dry_cleaning: "Servicios",
};

function tag(tags: Record<string, string>, ...claves: string[]): string {
  for (const k of claves) {
    const v = tags[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Normaliza la respuesta de Overpass a la forma que usa la siembra.
 *
 * Pura y testeada: Overpass devuelve tags libres y muy irregulares (el mismo
 * dato puede venir en `email` o en `contact:email`), y esa normalización es
 * donde se rompen las cosas en silencio.
 */
export function parsearElementos(elementos: readonly ElementoOsm[]): NegocioOsm[] {
  const out: NegocioOsm[] = [];
  for (const e of elementos) {
    const tags = e.tags;
    if (!tags) continue;
    const nombre = tag(tags, "name");
    if (!nombre) continue;

    const clave = tags.shop || tags.amenity || "";
    out.push({
      osmId: `${e.type ?? "node"}/${e.id ?? ""}`,
      nombre: nombre.slice(0, 200),
      rubro: RUBRO_POR_TAG[clave] || "Comercio",
      email: tag(tags, "email", "contact:email").toLowerCase(),
      telefono: tag(tags, "phone", "contact:phone", "contact:mobile").replace(/[^\d+]/g, ""),
      website: tag(tags, "website", "contact:website"),
      direccion: [tag(tags, "addr:street"), tag(tags, "addr:housenumber")].filter(Boolean).join(" "),
    });
  }
  return out;
}
