// Agrega el ciclo de vida completo de una búsqueda (Borrador/Activa/Pausada/
// Cubierta/Cerrada -- Promocionada y Vencida se derivan de featured_until y
// expires_at, no son un valor propio de `status`) más el contador de
// vistas. `active` se mantiene en sync con `status` para no tocar el
// listRule público ni el sitemap/feed, que ya filtran por `active=true`.
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

async function main() {
  const token = await authAdmin();
  const col = await fetch(`${PB_URL}/api/collections/job_posts`, {
    headers: { Authorization: token },
  }).then((r) => r.json());

  const existingNames = new Set(col.fields.map((f) => f.name));
  const newFields = [
    {
      name: "status",
      type: "select",
      required: false,
      maxSelect: 1,
      values: ["draft", "active", "paused", "filled", "closed"],
    },
    { name: "views", type: "number", required: false },
  ].filter((f) => !existingNames.has(f.name));

  if (newFields.length > 0) {
    const res = await fetch(`${PB_URL}/api/collections/job_posts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ fields: [...col.fields, ...newFields] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`update job_posts: ${JSON.stringify(data, null, 2)}`);
    console.log("Listo, agregados:", newFields.map((f) => f.name).join(", "));
  } else {
    console.log("Los campos ya existen, no hago nada de schema.");
  }

  // Backfill: los registros existentes no tienen `status` todavía -- lo
  // derivamos una sola vez de `active` para que no queden en blanco.
  let page = 1;
  let migrated = 0;
  for (;;) {
    const list = await fetch(
      `${PB_URL}/api/collections/job_posts/records?page=${page}&perPage=200&filter=${encodeURIComponent('status = ""')}`,
      { headers: { Authorization: token } },
    ).then((r) => r.json());
    if (!list.items?.length) break;
    for (const job of list.items) {
      const status = job.active ? "active" : "closed";
      await fetch(`${PB_URL}/api/collections/job_posts/records/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ status }),
      });
      migrated++;
    }
    if (page >= list.totalPages) break;
    page++;
  }
  console.log(`Backfill de status en ${migrated} búsqueda(s) existentes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
