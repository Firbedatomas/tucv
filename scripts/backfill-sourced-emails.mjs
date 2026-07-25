// Busca el email de contacto en el sitio web de las empresas ya sembradas.
//
// Google Places no devuelve email (no existe el campo): de 950 negocios
// capturados por Places, 0 tenían email y 650 tenían sitio. El sitio propio es
// la única fuente de email a escala, y es información que el negocio publica
// justamente para que lo contacten.
//
// Uso:
//   node scripts/backfill-sourced-emails.mjs                 (dry-run, 40)
//   node scripts/backfill-sourced-emails.mjs --limit 200
//   node scripts/backfill-sourced-emails.mjs --limit 700 --apply
import { readFileSync } from "node:fs";
import { extraerEmail } from "../lib/email-extraction.ts";

const args = process.argv.slice(2);
const APLICAR = args.includes("--apply");
const LIMITE = Number(args[args.indexOf("--limit") + 1]) || 40;
const CONCURRENCIA = 8;

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
  console.error("no se pudo autenticar");
  process.exit(1);
}
const H = { Authorization: auth.token };

let page = 1;
const todos = [];
for (;;) {
  const r = await (
    await fetch(
      `${PB}/api/collections/sourced_businesses/records?perPage=500&page=${page}&fields=id,name,website,contact_email,status`,
      { headers: H },
    )
  ).json();
  todos.push(...(r.items || []));
  if (page >= (r.totalPages || 1)) break;
  page++;
}

const pendientes = todos
  .filter((b) => (b.status || "detected") === "detected")
  .filter((b) => !b.contact_email)
  .filter((b) => b.website)
  .slice(0, LIMITE);

console.log(`sembrados: ${todos.length} | a revisar en esta corrida: ${pendientes.length}`);

// Muchos sitios de comercios chicos están caídos o tardan: timeout corto y se
// sigue. Un sitio que no responde no es un error del backfill.
async function emailDeSitio(sitio) {
  let url;
  try {
    url = new URL(sitio.startsWith("http") ? sitio : `https://${sitio}`);
  } catch {
    return null;
  }
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "TuCV-bot/1.0 (+https://tucv.ar)" },
    });
    if (!res.ok) return null;
    const tipo = res.headers.get("content-type") || "";
    if (!tipo.includes("text/html")) return null;
    const html = (await res.text()).slice(0, 400_000);
    return extraerEmail(html, url.hostname);
  } catch {
    return null;
  }
}

let encontrados = 0;
let guardados = 0;
let i = 0;
async function worker() {
  for (;;) {
    const b = pendientes[i++];
    if (!b) return;
    const email = await emailDeSitio(b.website);
    if (!email) continue;
    encontrados++;
    console.log(`  ${email}  <-  ${b.name}`);
    if (APLICAR) {
      const r = await fetch(`${PB}/api/collections/sourced_businesses/records/${b.id}`, {
        method: "PATCH",
        headers: { ...H, "Content-Type": "application/json" },
        body: JSON.stringify({ contact_email: email }),
      });
      if (r.ok) guardados++;
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCIA }, worker));

const pct = pendientes.length ? Math.round((encontrados / pendientes.length) * 100) : 0;
console.log(`\nrevisados: ${pendientes.length} | con email: ${encontrados} (${pct}%)`);
console.log(APLICAR ? `guardados: ${guardados}` : "DRY-RUN: no se guardó nada (--apply para guardar)");
