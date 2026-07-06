import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";

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

type Place = { name: string; placeId: string; address: string };

async function textSearch(query: string): Promise<Place[]> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=ar&key=${KEY}`;
  const r = await fetch(url, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
  if (!r || r.status !== "OK") return [];
  return (r.results || []).map((x: Record<string, unknown>) => ({
    name: (x.name as string) || "",
    placeId: (x.place_id as string) || "",
    address: (x.formatted_address as string) || "",
  }));
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

// Corre una tanda: rota combos por número de día, siembra hasta `limit` nuevas
// (dedup por place_id vía source_url). Devuelve cuántas sembró.
export async function runDailyCapture(dayNumber: number, limit = 50): Promise<{ seeded: number; combosUsed: string[] }> {
  if (!KEY) return { seeded: 0, combosUsed: [] };
  const admin = await pbAdmin();

  const combos: [string, string, string][] = [];
  for (const [rubro, cat] of CAPTURE_RUBROS) for (const zona of CAPTURE_ZONES) combos.push([rubro, cat, zona]);
  // arranca en un offset distinto cada día
  const start = (dayNumber * 5) % combos.length;
  const ordered = [...combos.slice(start), ...combos.slice(0, start)];

  let seeded = 0;
  const combosUsed: string[] = [];
  for (const [rubro, cat, zona] of ordered) {
    if (seeded >= limit) break;
    const places = await textSearch(`${rubro} en ${zona} Argentina`);
    if (!places.length) continue;
    combosUsed.push(`${rubro}/${zona}`);
    for (const p of places) {
      if (seeded >= limit) break;
      if (!p.placeId || !p.name) continue;
      const sourceUrl = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
      // dedup por place_id
      const dup = await admin.collection("sourced_businesses").getFirstListItem(admin.filter("source_url = {:u}", { u: sourceUrl }), { requestKey: null }).catch(() => null);
      if (dup) continue;

      const det = await placeDetails(p.placeId);
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
          logo_url: det.website ? `https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(det.website).hostname; } catch { return ""; } })()}&sz=128` : "",
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
  return { seeded, combosUsed };
}
