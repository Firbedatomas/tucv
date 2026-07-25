// Siembra comercios desde OpenStreetMap (Overpass API). GRATIS: no usa Google.
//
// Complementa a la captura de Places, que es paga. OSM cubre menos (medido en
// Córdoba: 3% con email directo, 8% con web, contra 68% con web de Places),
// pero es lo único que trae el email servido y no cuesta nada.
//
// Igual que en Places, solo se guardan negocios CON email: si no viene en los
// tags, se busca en el sitio del negocio.
//
// Overpass es infraestructura donada: una consulta por ciudad, con pausa entre
// medio y User-Agent identificable. No se martilla.
//
// Uso:
//   node scripts/capture-osm.mjs                    (dry-run, 3 zonas)
//   node scripts/capture-osm.mjs --zonas 12 --apply
import { readFileSync } from "node:fs";
import { parsearElementos, consultaOverpass, ZONAS_OSM } from "../lib/osm-capture.ts";
import { esCadenaConocida } from "../lib/chain-detection.ts";
import { extraerEmail } from "../lib/email-extraction.ts";

const args = process.argv.slice(2);
const APLICAR = args.includes("--apply");
const N_ZONAS = Number(args[args.indexOf("--zonas") + 1]) || 3;
const PAUSA_MS = 8000; // entre consultas a Overpass

const RAIZ = new URL("..", import.meta.url).pathname;
const env = Object.fromEntries(
  readFileSync(`${RAIZ}/.env`, "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const PB = env.NEXT_PUBLIC_POCKETBASE_URL || "https://pb.tucv.ar";
const auth = await (
  await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: env.PB_ADMIN_EMAIL, password: env.PB_ADMIN_PASSWORD }),
  })
).json();
if (!auth.token) {
  console.error("no se pudo autenticar contra PocketBase");
  process.exit(1);
}
const H = { Authorization: auth.token };

// Nombres ya sembrados: el dedup es por nombre exacto, igual que en la captura
// de Places (una sucursal más de una marca que ya tenemos no aporta).
let page = 1;
const existentes = new Set();
const emailsUsados = new Set();
for (;;) {
  const r = await (
    await fetch(`${PB}/api/collections/sourced_businesses/records?perPage=500&page=${page}&fields=name,source_url,contact_email`, {
      headers: H,
    })
  ).json();
  for (const b of r.items || []) {
    if (b.name) existentes.add(b.name.trim().toLowerCase());
    if (b.source_url) existentes.add(b.source_url);
    if (b.contact_email) emailsUsados.add(b.contact_email.trim().toLowerCase());
  }
  if (page >= (r.totalPages || 1)) break;
  page++;
}
console.log(`ya sembrados: ${existentes.size} claves | ${emailsUsados.size} emails en uso`);

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(query) {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "User-Agent": "TuCV-bot/1.0 (+https://tucv.ar)" },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(180000),
  });
  const txt = await res.text();
  if (!txt.startsWith("{")) return null; // Overpass devuelve HTML cuando está saturado
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

async function emailDeSitio(sitio) {
  if (!sitio) return "";
  let url;
  try {
    url = new URL(sitio.startsWith("http") ? sitio : `https://${sitio}`);
  } catch {
    return "";
  }
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "TuCV-bot/1.0 (+https://tucv.ar)" },
    });
    if (!res.ok) return "";
    if (!(res.headers.get("content-type") || "").includes("text/html")) return "";
    return extraerEmail((await res.text()).slice(0, 400_000), url.hostname) || "";
  } catch {
    return "";
  }
}

const rand = () => Math.random().toString(36).slice(2, 7);
const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

let totalSembrados = 0;
let totalCadenas = 0;
let totalSinEmail = 0;
let totalDup = 0;

for (const zona of ZONAS_OSM.slice(0, N_ZONAS)) {
  const data = await overpass(consultaOverpass(zona.bbox));
  if (!data) {
    console.log(`${zona.nombre}: Overpass saturado, salteo`);
    await espera(PAUSA_MS);
    continue;
  }
  const negocios = parsearElementos(data.elements || []);
  let sembradosZona = 0;

  for (const n of negocios) {
    if (esCadenaConocida(n.nombre)) {
      totalCadenas++;
      continue;
    }
    if (existentes.has(n.nombre.trim().toLowerCase()) || existentes.has(n.osmId)) {
      totalDup++;
      continue;
    }
    // Email de los tags; si no hay, del sitio.
    let email = n.email;
    if (!email && n.website) email = await emailDeSitio(n.website);
    if (!email) {
      totalSinEmail++;
      continue;
    }

    // Dos entradas de OSM pueden ser el mismo negocio con nombres distintos
    // ("Albur" y "Albur - Bar"). El email es la identidad real: si ya lo
    // tenemos, es la misma casilla y escribirle dos veces sería spam.
    if (emailsUsados.has(email)) {
      totalDup++;
      continue;
    }
    emailsUsados.add(email);
    existentes.add(n.nombre.trim().toLowerCase());
    sembradosZona++;
    totalSembrados++;
    console.log(`  ${email}  <-  ${n.nombre} (${zona.nombre})`);

    if (!APLICAR) continue;

    const biz = await fetch(`${PB}/api/collections/sourced_businesses/records`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: n.nombre,
        rubro: n.rubro,
        city_zone: zona.nombre,
        address: n.direccion.slice(0, 250),
        contact_email: email,
        contact_phone: n.telefono,
        website: n.website.slice(0, 300),
        source_type: "osm",
        source_url: n.osmId,
        evidence: `Detectado en OpenStreetMap (${zona.nombre})`,
        region: "ar",
        status: "detected",
        public_slug: `${slugify(n.nombre) || "empresa"}-${rand()}`,
      }),
    }).then((r) => (r.ok ? r.json() : null));

    if (biz) {
      await fetch(`${PB}/api/collections/sourced_jobs/records`, {
        method: "POST",
        headers: { ...H, "Content-Type": "application/json" },
        body: JSON.stringify({
          sourced_business: biz.id,
          role: "Sumate al equipo",
          rubro: n.rubro,
          status: "detected",
          source_url: n.osmId,
          public_slug: `sumate-${rand()}`,
        }),
      }).catch(() => null);
    }
  }

  console.log(`${zona.nombre}: ${negocios.length} comercios -> ${sembradosZona} con email`);
  await espera(PAUSA_MS);
}

console.log(`\ntotal con email: ${totalSembrados}`);
console.log(`descartados -> cadenas: ${totalCadenas} | ya existían: ${totalDup} | sin email: ${totalSinEmail}`);
console.log(APLICAR ? "guardados en PocketBase" : "DRY-RUN: no se guardó nada (--apply)");
