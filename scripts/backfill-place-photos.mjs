#!/usr/bin/env node
// Backfill: reemplaza el logo de las PYMES ya sembradas (source_type=gmaps) por
// la FOTO real del negocio de Google Places (o lo deja vacío si tenía un favicon
// genérico de IG/FB). Uso: node scripts/backfill-place-photos.mjs
import fs from "node:fs";

const env = {};
for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const PB = "https://pb.tucv.ar";
const KEY = env.GOOGLE_MAPS_API_KEY;

async function resolvePhoto(ref) {
  if (!ref) return "";
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${ref}&key=${KEY}`, { redirect: "manual" }).catch(() => null);
  const loc = r?.headers.get("location") || "";
  return loc.startsWith("http") ? loc.slice(0, 500) : "";
}
async function photoRefFor(placeId) {
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${KEY}`).then((x) => x.json()).catch(() => null);
  return r?.result?.photos?.[0]?.photo_reference || "";
}

const tok = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identity: env.PB_ADMIN_EMAIL, password: env.PB_ADMIN_PASSWORD }),
}).then((r) => r.json()).then((d) => d.token);
const H = { "Content-Type": "application/json", Authorization: tok };

const rows = await fetch(`${PB}/api/collections/sourced_businesses/records?perPage=200&filter=${encodeURIComponent('source_type="gmaps"')}`, { headers: H }).then((r) => r.json());
let fixed = 0, cleared = 0;
for (const b of rows.items || []) {
  const pid = (b.source_url || "").match(/place_id:([A-Za-z0-9_-]+)/)?.[1];
  if (!pid) continue;
  const ref = await photoRefFor(pid);
  const photo = await resolvePhoto(ref);
  // si conseguimos foto -> la usamos; si el logo actual es un favicon de IG/FB y
  // no hay foto -> lo vaciamos (inicial limpia).
  let patch = null;
  if (photo) patch = { logo_url: photo };
  else if (/instagram\.com|facebook\.com/i.test(b.logo_url || "")) patch = { logo_url: "" };
  if (!patch) continue;
  await fetch(`${PB}/api/collections/sourced_businesses/records/${b.id}`, { method: "PATCH", headers: H, body: JSON.stringify(patch) }).catch(() => {});
  if (photo) fixed++; else cleared++;
  process.stdout.write(".");
}
console.log(`\nfoto real puesta: ${fixed} · favicon IG/FB limpiado: ${cleared} · total gmaps: ${(rows.items || []).length}`);
