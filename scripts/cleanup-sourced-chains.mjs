#!/usr/bin/env node
// Marca como `opted_out` los negocios sembrados que hoy no pasarían el filtro
// de cadenas (ver lib/chain-detection.ts). NO borra nada: cambia el estado, y
// deja un backup con el estado anterior de cada registro para poder revertir.
//
// Dos criterios distintos, a propósito:
//   - Cadena conocida  -> se dan de baja TODAS las sucursales. Una cadena
//     nacional no va a reclamar un perfil en TuCV.
//   - Nombre repetido  -> se CONSERVA una y se dan de baja las demás. Puede
//     ser una mini-cadena local legítima ("Café de Barrio" tiene 7 locales),
//     y esa sí es cliente posible -- pero se contacta a un solo dueño, así que
//     tener 7 filas idénticas en la cola es ruido. Se conserva la que tiene
//     más interés de candidatos; a igual interés, la más vieja.
//
// Uso:
//   node scripts/cleanup-sourced-chains.mjs           (dry-run, no toca nada)
//   node scripts/cleanup-sourced-chains.mjs --apply   (aplica)
import { readFileSync, writeFileSync } from "node:fs";
import { esCadenaConocida } from "../lib/chain-detection.ts";

const APLICAR = process.argv.includes("--apply");
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
  console.error("No se pudo autenticar contra PocketBase");
  process.exit(1);
}
const H = { Authorization: auth.token };

async function todos(coleccion, fields) {
  let page = 1;
  const items = [];
  for (;;) {
    const r = await (
      await fetch(`${PB}/api/collections/${coleccion}/records?perPage=500&page=${page}&fields=${fields}`, { headers: H })
    ).json();
    items.push(...(r.items || []));
    if (page >= (r.totalPages || 1)) break;
    page++;
  }
  return items;
}

const negocios = await todos("sourced_businesses", "id,name,status,created");
const jobs = await todos("sourced_jobs", "id,sourced_business");
const intereses = await todos("candidate_interest", "sourced_job");

const negocioDeJob = new Map(jobs.map((j) => [j.id, j.sourced_business]));
const interesPorNegocio = new Map();
for (const i of intereses) {
  const b = negocioDeJob.get(i.sourced_job);
  if (b) interesPorNegocio.set(b, (interesPorNegocio.get(b) || 0) + 1);
}
const interes = (b) => interesPorNegocio.get(b.id) || 0;

// Solo se consideran los que siguen en "detected": si alguien ya los contactó
// o los reclamó, no los tocamos.
const activos = negocios.filter((b) => (b.status || "detected") === "detected");

const aDarDeBaja = [];
const cadenas = activos.filter((b) => esCadenaConocida(b.name || ""));
aDarDeBaja.push(...cadenas.map((b) => ({ ...b, motivo: "cadena conocida" })));

const yaMarcados = new Set(cadenas.map((b) => b.id));
const porNombre = new Map();
for (const b of activos) {
  if (yaMarcados.has(b.id)) continue;
  const clave = (b.name || "").trim().toLowerCase();
  if (!clave) continue;
  if (!porNombre.has(clave)) porNombre.set(clave, []);
  porNombre.get(clave).push(b);
}
for (const [, grupo] of porNombre) {
  if (grupo.length < 2) continue;
  // Se conserva la de más interés; a igual interés, la más vieja.
  const ordenado = [...grupo].sort((a, b) => interes(b) - interes(a) || String(a.created).localeCompare(String(b.created)));
  for (const b of ordenado.slice(1)) {
    aDarDeBaja.push({ ...b, motivo: `sucursal repetida (se conserva "${ordenado[0].name}")` });
  }
}

const conInteres = aDarDeBaja.filter((b) => interes(b) > 0);
console.log(`sembrados totales: ${negocios.length}  |  en estado "detected": ${activos.length}`);
console.log(`a dar de baja: ${aDarDeBaja.length}`);
console.log(`  - por cadena conocida: ${aDarDeBaja.filter((b) => b.motivo === "cadena conocida").length}`);
console.log(`  - por sucursal repetida: ${aDarDeBaja.filter((b) => b.motivo !== "cadena conocida").length}`);
console.log(`de esos, con interés de candidatos: ${conInteres.length}`);
for (const b of conInteres) console.log(`    ${interes(b)} interesado(s)  ${b.name}  (${b.motivo})`);

if (!APLICAR) {
  console.log("\nDRY-RUN: no se modificó nada. Volvé a correr con --apply para aplicar.");
  process.exit(0);
}

const backup = `${RAIZ}/ops/backup-sourced-optout-${Date.now()}.json`;
writeFileSync(backup, JSON.stringify(aDarDeBaja.map((b) => ({ id: b.id, name: b.name, statusAnterior: b.status || "detected", motivo: b.motivo })), null, 2));
console.log(`\nbackup escrito en ${backup}`);

let ok = 0;
let fallos = 0;
for (const b of aDarDeBaja) {
  const r = await fetch(`${PB}/api/collections/sourced_businesses/records/${b.id}`, {
    method: "PATCH",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "opted_out" }),
  });
  if (r.ok) ok++;
  else fallos++;
}
console.log(`aplicado: ${ok} dados de baja, ${fallos} fallos`);
