// Agrega un índice único (job_post, candidate) a `applications` para que la
// base rechace postulaciones duplicadas aunque el frontend tenga un bug
// (el estado "ya aplicado" en /b/[slug] era solo client-side, se perdía al
// recargar). Correr una sola vez.
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
  const res = await fetch(`${PB_URL}/api/collections/applications`, { headers: { Authorization: token } });
  const applications = await res.json();

  const indexName = "idx_unique_application_per_job";
  if (applications.indexes.some((i) => i.includes(indexName))) {
    console.log("El índice ya existe, no hago nada.");
    return;
  }

  const indexes = [
    ...applications.indexes,
    `CREATE UNIQUE INDEX \`${indexName}\` ON \`applications\` (\`job_post\`, \`candidate\`)`,
  ];

  const patchRes = await fetch(`${PB_URL}/api/collections/applications`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ indexes }),
  });
  const patchBody = await patchRes.json();
  if (!patchRes.ok) throw new Error(`patch applications: ${JSON.stringify(patchBody, null, 2)}`);
  console.log("Listo, índice único agregado.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
