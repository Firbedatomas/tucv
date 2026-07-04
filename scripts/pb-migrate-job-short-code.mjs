// Agrega job_posts.short_code: un código corto (6 caracteres) que junto al
// nombre del negocio arma la URL pública nueva, más legible que el slug
// largo actual (/b/negocio-puesto-a-b1c2d) -- /b/{negocio}/{short_code}.
// El slug viejo NO se toca ni se borra: sigue siendo la clave de búsqueda
// de la ruta vieja (/b/[slug]/page.tsx), que se mantiene funcionando tal
// cual para no romper links/QRs ya impresos o compartidos.
const PB_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

async function authAdmin() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.token;
}

function randomCode(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function main() {
  const token = await authAdmin();
  const col = await fetch(`${PB_URL}/api/collections/job_posts`, { headers: { Authorization: token } }).then((r) =>
    r.json(),
  );

  if (!col.fields.some((f) => f.name === "short_code")) {
    const nextFields = [
      ...col.fields,
      {
        name: "short_code",
        type: "text",
        required: false,
        presentable: false,
        min: 0,
        max: 12,
        pattern: "^[a-z0-9]*$",
      },
    ];
    const res = await fetch(`${PB_URL}/api/collections/job_posts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ fields: nextFields }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`add field: ${JSON.stringify(data, null, 2)}`);
    console.log("Campo `short_code` agregado.");
  } else {
    console.log("Campo `short_code` ya existe, no lo vuelvo a agregar.");
  }

  // Backfill: reusa el sufijo random que YA tenía el slug viejo
  // ("negocio-puesto-b1c2d3" -> "b1c2d3") cuando existe, para que el código
  // nuevo no sea 100% arbitrario -- si por lo que sea no hay uno (slug raro,
  // muy corto), genera uno nuevo y lo valida contra duplicados ya usados en
  // este mismo backfill.
  const jobs = await fetch(`${PB_URL}/api/collections/job_posts/records?perPage=500&fields=id,slug,short_code`, {
    headers: { Authorization: token },
  }).then((r) => r.json());

  const used = new Set(jobs.items.filter((j) => j.short_code).map((j) => j.short_code));
  let updated = 0;
  for (const job of jobs.items) {
    if (job.short_code) continue;
    const fromSlug = job.slug?.split("-").pop();
    let code = fromSlug && /^[a-z0-9]{4,8}$/.test(fromSlug) && !used.has(fromSlug) ? fromSlug : randomCode();
    while (used.has(code)) code = randomCode();
    used.add(code);
    const res = await fetch(`${PB_URL}/api/collections/job_posts/records/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ short_code: code }),
    });
    if (!res.ok) throw new Error(`backfill ${job.id}: ${JSON.stringify(await res.json())}`);
    updated++;
  }
  console.log(`Backfill de short_code en ${updated} búsqueda(s) existente(s).`);

  // Índice único -- recién ahora, con todas las filas ya con un valor no
  // vacío y sin duplicados, así no rompe por choque contra strings vacíos.
  const col2 = await fetch(`${PB_URL}/api/collections/job_posts`, { headers: { Authorization: token } }).then((r) =>
    r.json(),
  );
  const hasIndex = col2.indexes.some((i) => i.includes("idx_job_posts_short_code"));
  if (!hasIndex) {
    const nextIndexes = [...col2.indexes, "CREATE UNIQUE INDEX idx_job_posts_short_code ON job_posts (short_code)"];
    const res = await fetch(`${PB_URL}/api/collections/job_posts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ indexes: nextIndexes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`add index: ${JSON.stringify(data, null, 2)}`);
    console.log("Índice único agregado sobre `short_code`.");
  } else {
    console.log("Índice único sobre `short_code` ya existe.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
