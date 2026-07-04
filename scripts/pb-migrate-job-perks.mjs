// Agrega `perks` (json, array de strings) a job_posts: condiciones/beneficios
// opcionales del puesto (obra social, turno cortado, movilidad, etc.),
// mismo patrón que `shift`/`availability` en otras colecciones.
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
  const res = await fetch(`${PB_URL}/api/collections/job_posts`, { headers: { Authorization: token } });
  const jobPosts = await res.json();

  if (jobPosts.fields.some((f) => f.name === "perks")) {
    console.log("`perks` ya existe en job_posts, no hago nada.");
    return;
  }

  const fields = [...jobPosts.fields, { name: "perks", type: "json", required: false, maxSize: 2000 }];

  const patchRes = await fetch(`${PB_URL}/api/collections/job_posts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ fields }),
  });
  const patchBody = await patchRes.json();
  if (!patchRes.ok) throw new Error(`patch job_posts: ${JSON.stringify(patchBody, null, 2)}`);
  console.log("Listo, `perks` agregado a job_posts.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
