// Permite que el candidato vea/liste sus PROPIAS postulaciones (antes solo
// podía el negocio dueño de la búsqueda) -- lo necesita /b/[slug] para saber
// si ya se postuló a esa búsqueda al cargar la página, en vez de confiar
// solo en el estado de React (se perdía al recargar). No toca updateRule:
// el candidato sigue sin poder cambiar el estado de su propia postulación.
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
  const rule =
    '@request.auth.id != "" && (job_post.business.user = @request.auth.id || candidate.user = @request.auth.id)';

  const res = await fetch(`${PB_URL}/api/collections/applications`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ viewRule: rule, listRule: rule }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`patch applications: ${JSON.stringify(body, null, 2)}`);
  console.log("Listo, applications.viewRule/listRule ahora incluyen al candidato dueño.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
