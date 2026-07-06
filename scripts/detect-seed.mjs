#!/usr/bin/env node
// Robot de detección + siembra de empresas para el piloto de captación.
//
// Uso:
//   node scripts/detect-seed.mjs <url> [--rubro "Gastronomía"] [--zona "Nueva Córdoba"] [--dry]
//
// Qué hace (automático):
//   1. Baja la página pública (careers / "trabajá con nosotros" / aviso).
//   2. Extrae: nombre del negocio (schema Organization / og:site_name / <title>),
//      email y WhatsApp de contacto, y PUESTOS si la página trae schema.org
//      JobPosting (JSON-LD). Si no hay puestos, usa un llamado general.
//   3. Siembra en sourced_businesses + sourced_jobs (dedup por source_url) vía el
//      superusuario de PocketBase. Imprime la URL pública /e/<slug>.
//
// Honesto sobre límites: NO scrapea Instagram/Facebook (anti-bot + ToS). Sirve
// para webs propias con "trabajá con nosotros", avisos con datos estructurados y
// páginas públicas fetcheables. La detección de posts de IG sigue siendo manual
// (cargarlos por /admin/captacion).
import fs from "node:fs";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const opt = (name, def = "") => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const DRY = args.includes("--dry");
if (!url) {
  console.error("Falta la URL. Uso: node scripts/detect-seed.mjs <url> [--rubro X] [--zona Y] [--dry]");
  process.exit(1);
}

// --- .env ---
const env = {};
try {
  for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
} catch {}
const PB = env.POCKETBASE_PUBLIC_URL || "https://pb.tucv.ar";
const ADMIN_EMAIL = env.PB_ADMIN_EMAIL;
const ADMIN_PASS = env.PB_ADMIN_PASSWORD;

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}
const rand = () => Math.random().toString(36).slice(2, 7).replace(/[^a-z0-9]/g, "x");

function extract(html) {
  const out = { name: "", email: "", whatsapp: "", roles: [] };

  // schema.org (Organization + JobPosting) en JSON-LD
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ld) {
    try {
      const data = JSON.parse(m[1].trim());
      const nodes = Array.isArray(data) ? data : data["@graph"] || [data];
      for (const n of nodes) {
        const t = String(n["@type"] || "");
        if (!out.name && /Organization|LocalBusiness|Restaurant|Store/i.test(t) && n.name) out.name = n.name;
        if (/JobPosting/i.test(t) && n.title) out.roles.push(String(n.title).trim());
      }
    } catch {}
  }

  // nombre de respaldo
  if (!out.name) {
    const og = html.match(/<meta[^>]+og:site_name[^>]+content=["']([^"']+)["']/i);
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    out.name = (og?.[1] || title?.[1] || "").split(/[|\-–—]/)[0].trim();
  }

  // contacto -- filtramos falsos positivos tipo "logo@2x.png" (assets retina)
  // y otras extensiones de archivo que matchean el patrón de email.
  const email = [...html.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)]
    .map((x) => x[0])
    .filter((e) => !/\.(png|jpe?g|svg|webp|gif|css|js|mjs|woff2?|ico|mp4|pdf)$/i.test(e));
  out.email = email.find((e) => /rrhh|capital|empleo|trabajo|talento|contacto|recursos|hr/i.test(e)) || email[0] || "";
  const wa = html.match(/wa\.me\/(\d{8,15})/i) || html.match(/(?:\+?54\s*9?\s*)(\d[\d\s-]{7,13}\d)/);
  if (wa) out.whatsapp = (wa[1] || wa[0]).replace(/[\s-]/g, "");

  return out;
}

async function main() {
  console.log(`→ Bajando ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 TuCV-detector" }, redirect: "follow" }).catch(() => null);
  if (!res || !res.ok) {
    console.error(`No pude bajar la página (status ${res?.status}). Puede tener anti-bot.`);
    process.exit(1);
  }
  const html = await res.text();
  const d = extract(html);
  const name = d.name;
  const rubro = opt("rubro");
  const zona = opt("zona");
  if (!name) {
    console.error("No pude detectar el nombre del negocio. Cargala a mano por /admin/captacion.");
    process.exit(1);
  }
  const roles = d.roles.length ? d.roles.slice(0, 5) : ["Sumate al equipo"];

  console.log("\nDetectado:");
  console.log(`  Nombre:   ${name}`);
  console.log(`  Rubro:    ${rubro || "(no seteado — pasá --rubro)"}`);
  console.log(`  Zona:     ${zona || "(no seteada — pasá --zona)"}`);
  console.log(`  Email:    ${d.email || "—"}`);
  console.log(`  WhatsApp: ${d.whatsapp || "—"}`);
  console.log(`  Búsquedas: ${roles.join(" · ")}`);

  if (DRY) { console.log("\n(--dry: no siembra)"); return; }
  if (!ADMIN_EMAIL || !ADMIN_PASS) { console.error("Faltan PB_ADMIN_EMAIL/PASSWORD en .env"); process.exit(1); }

  const auth = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  }).then((r) => r.json());
  const token = auth.token;
  if (!token) { console.error("No pude autenticarme al PB."); process.exit(1); }
  const H = { "Content-Type": "application/json", Authorization: token };

  // dedup por source_url
  const dup = await fetch(`${PB}/api/collections/sourced_businesses/records?perPage=1&filter=${encodeURIComponent(`source_url="${url}"`)}`, { headers: H }).then((r) => r.json());
  if (dup?.totalItems > 0) { console.log(`\nYa estaba sembrada (source_url repetido). id=${dup.items[0].id}`); return; }

  const slug = `${slugify(name) || "empresa"}-${rand()}`;
  const biz = await fetch(`${PB}/api/collections/sourced_businesses/records`, {
    method: "POST", headers: H,
    body: JSON.stringify({
      name, rubro, city_zone: zona, contact_email: d.email, contact_phone: d.whatsapp,
      source_type: "website", source_url: url, evidence: `Detectado en ${url}`,
      region: "cordoba", status: "detected", public_slug: slug,
    }),
  }).then((r) => r.json());
  if (!biz.id) { console.error("Error al crear la empresa:", JSON.stringify(biz).slice(0, 200)); process.exit(1); }

  let n = 0;
  for (const role of roles) {
    const r = await fetch(`${PB}/api/collections/sourced_jobs/records`, {
      method: "POST", headers: H,
      body: JSON.stringify({ sourced_business: biz.id, role, rubro, source_url: url, status: "detected", public_slug: `${slugify(role) || "busqueda"}-${rand()}` }),
    }).then((x) => x.json());
    if (r.id) n++;
  }
  console.log(`\n✓ Sembrada: ${name} (${n} búsqueda${n !== 1 ? "s" : ""})`);
  console.log(`  Página:  https://tucv.ar/e/${slug}`);
  console.log(`  Reclamo: https://tucv.ar/e/${slug}/reclamar`);
}

main().catch((e) => { console.error(e); process.exit(1); });
