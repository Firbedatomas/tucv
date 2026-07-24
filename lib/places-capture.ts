import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { esCadenaConocida } from "@/lib/chain-detection";

// Captura de PYMES / comercio de barrio desde Google Places (Text Search +
// Details). Fuente estructurada donde SÍ está el comercio local (que no tiene
// careers page). Honesto: se siembra como "no verificado" + claimable + opt-out,
// y el gancho al negocio es la DEMANDA real ("N personas quieren trabajar acá"),
// no un aviso inventado (a gmaps no le consta que estén contratando).

const KEY = process.env.GOOGLE_MAPS_API_KEY || "";

// Zonas donde están los candidatos (ver geo de los perfiles) + rubros locales de
// alta rotación. El cron rota por (rubro x zona) según el día -> cada día cubre
// combos distintos y va avanzando.
export const CAPTURE_ZONES = ["La Plata", "CABA", "Córdoba", "Mar del Plata", "San Martín", "Quilmes"];
export const CAPTURE_RUBROS = [
  ["peluquería", "Belleza / estética"],
  ["barbería", "Belleza / estética"],
  ["cafetería", "Gastronomía"],
  ["restaurante", "Gastronomía"],
  ["panadería", "Gastronomía"],
  ["rotisería", "Gastronomía"],
  ["heladería", "Gastronomía"],
  ["pizzería", "Gastronomía"],
  ["kiosco", "Comercio"],
  ["dietética", "Comercio"],
  ["indumentaria", "Comercio"],
  ["ferretería", "Comercio"],
  ["verdulería", "Comercio"],
  ["farmacia", "Salud"],
  ["gimnasio", "Servicios"],
];

type Place = { name: string; placeId: string; address: string; photoRef: string };

async function textSearch(query: string): Promise<Place[]> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=ar&key=${KEY}`;
  const r = await fetch(url, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
  if (!r || r.status !== "OK") return [];
  return (r.results || []).map((x: Record<string, unknown>) => ({
    name: (x.name as string) || "",
    placeId: (x.place_id as string) || "",
    address: (x.formatted_address as string) || "",
    photoRef: ((x.photos as { photo_reference?: string }[] | undefined)?.[0]?.photo_reference) || "",
  }));
}

// Resuelve la foto REAL del negocio (Google Places Photo). La API redirige a una
// URL de googleusercontent SIN key -> la guardamos esa (no exponemos la API key
// ni gastamos quota en cada vista). Es la imagen del negocio (cartel/local/logo),
// mucho mejor que el favicon genérico de Instagram.
async function resolvePhotoUrl(photoRef: string): Promise<string> {
  if (!photoRef) return "";
  const api = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${KEY}`;
  const res = await fetch(api, { redirect: "manual", cache: "no-store" }).catch(() => null);
  const loc = res?.headers.get("location") || "";
  return loc.startsWith("http") ? loc.slice(0, 500) : "";
}

// Un favicon de red social es genérico (el ícono de IG/FB), NO el logo del
// negocio -> no sirve como logo.
function isGenericFavicon(url: string): boolean {
  return /instagram\.com|facebook\.com|fbcdn/i.test(url);
}

async function placeDetails(placeId: string): Promise<{ phone: string; website: string }> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=international_phone_number,website&key=${KEY}`;
  const r = await fetch(url, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
  const res = r?.result || {};
  return {
    phone: (res.international_phone_number || "").replace(/[^\d+]/g, ""),
    website: res.website || "",
  };
}

function slugify(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}
const rand = () => Math.random().toString(36).slice(2, 7).replace(/[^a-z0-9]/g, "x");

function zoneMatches(hay: string, zone: string): boolean {
  if (zone === "CABA") return /caba|capital federal|ciudad aut[oó]noma/.test(hay) || (/\bbuenos aires\b/.test(hay) && !/provincia|province|gba/.test(hay));
  return hay.includes(zone.toLowerCase());
}

// Ordena las zonas de captura por VOLUMEN de candidatos (leyendo de dónde son los
// perfiles) -> cada corrida siembra más negocios donde hay más demanda. Las zonas
// sin candidatos quedan al final (igual se cubren, pero después).
async function zonesByCandidateVolume(admin: Awaited<ReturnType<typeof pbAdmin>>): Promise<string[]> {
  const profiles = await admin
    .collection("candidate_profiles")
    .getFullList({ fields: "city,city_zone", requestKey: null })
    .catch(() => []);
  const count = new Map<string, number>(CAPTURE_ZONES.map((z) => [z, 0]));
  for (const p of profiles) {
    const hay = `${(p.city as string) || ""} ${(p.city_zone as string) || ""}`.toLowerCase();
    for (const z of CAPTURE_ZONES) {
      if (zoneMatches(hay, z)) {
        count.set(z, (count.get(z) || 0) + 1);
        break;
      }
    }
  }
  return [...CAPTURE_ZONES].sort((a, b) => (count.get(b) || 0) - (count.get(a) || 0));
}

// Corre una tanda: prioriza zonas por volumen de candidatos, rota rubros por día,
// y siembra hasta `limit` nuevas (dedup por place_id). Devuelve cuántas sembró.
export async function runDailyCapture(dayNumber: number, limit = 50): Promise<{ seeded: number; descartadasPorCadena: number; combosUsed: string[] }> {
  if (!KEY) return { seeded: 0, descartadasPorCadena: 0, combosUsed: [] };
  const admin = await pbAdmin();

  const zonesOrdered = await zonesByCandidateVolume(admin);
  // rubros rotados por día para no re-consultar los mismos combos cada corrida
  const rStart = (dayNumber * 3) % CAPTURE_RUBROS.length;
  const rubrosOrdered = [...CAPTURE_RUBROS.slice(rStart), ...CAPTURE_RUBROS.slice(0, rStart)];
  // combos: zona (por volumen) primero -> se llena antes donde hay más candidatos
  const ordered: [string, string, string][] = [];
  for (const zona of zonesOrdered) for (const [rubro, cat] of rubrosOrdered) ordered.push([rubro, cat, zona]);

  let seeded = 0;
  let descartadasPorCadena = 0;
  const combosUsed: string[] = [];
  for (const [rubro, cat, zona] of ordered) {
    if (seeded >= limit) break;
    const places = await textSearch(`${rubro} en ${zona} Argentina`);
    if (!places.length) continue;
    combosUsed.push(`${rubro}/${zona}`);
    for (const p of places) {
      if (seeded >= limit) break;
      if (!p.placeId || !p.name) continue;

      // Google Places devuelve primero lo más prominente, así que "cafetería en
      // Córdoba" trae Starbucks antes que la cafetería del barrio. El cliente de
      // TuCV es el comercio local: una cadena tiene RRHH centralizado, no va a
      // reclamar su perfil, y sembrarla gasta cuota de API y ensucia la cola de
      // captación (medido el 2026-07-24: la mayoría de los sembrados con
      // candidatos interesados eran cadenas y ninguno convirtió).
      if (esCadenaConocida(p.name)) {
        descartadasPorCadena += 1;
        continue;
      }

      const sourceUrl = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
      // dedup por place_id
      const dup = await admin.collection("sourced_businesses").getFirstListItem(admin.filter("source_url = {:u}", { u: sourceUrl }), { requestKey: null }).catch(() => null);
      if (dup) continue;

      // Cadena que no está en la lista: si ya sembramos un negocio con el
      // MISMO nombre exacto (otra sucursal, otro place_id), es multi-local.
      // Complementa la lista curada sin tener que preverlo todo.
      const mismoNombre = await admin
        .collection("sourced_businesses")
        .getFirstListItem(admin.filter("name = {:n}", { n: p.name.slice(0, 200) }), { requestKey: null })
        .catch(() => null);
      if (mismoNombre) {
        descartadasPorCadena += 1;
        continue;
      }

      const det = await placeDetails(p.placeId);
      // Logo: primero la FOTO real del negocio (Google Places); si no hay, el
      // favicon del sitio SOLO si es un dominio propio (no Instagram/Facebook,
      // que darían el ícono genérico de la red). Si nada sirve, vacío -> inicial.
      let logo = await resolvePhotoUrl(p.photoRef);
      if (!logo && det.website && !isGenericFavicon(det.website)) {
        try {
          logo = `https://www.google.com/s2/favicons?domain=${new URL(det.website).hostname}&sz=128`;
        } catch {}
      }
      const slug = `${slugify(p.name) || "empresa"}-${rand()}`;
      const biz = await admin
        .collection("sourced_businesses")
        .create({
          name: p.name.slice(0, 200),
          rubro: cat,
          city_zone: zona,
          address: p.address.slice(0, 250),
          contact_phone: det.phone,
          website: det.website.slice(0, 300),
          logo_url: logo,
          source_type: "gmaps",
          source_url: sourceUrl,
          evidence: `Detectado en Google Maps (${rubro} en ${zona})`,
          region: "ar",
          status: "detected",
          public_slug: slug,
        })
        .catch(() => null);
      if (!biz) continue;
      await admin
        .collection("sourced_jobs")
        .create({ sourced_business: biz.id, role: "Sumate al equipo", rubro: cat, status: "detected", source_url: sourceUrl, public_slug: `sumate-${rand()}` })
        .catch(() => null);
      seeded += 1;
    }
  }
  return { seeded, descartadasPorCadena, combosUsed };
}
