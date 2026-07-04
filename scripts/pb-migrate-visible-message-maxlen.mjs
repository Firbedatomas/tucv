// visible_message pasó de texto plano a HTML (editor enriquecido, hasta
// 4000 caracteres de texto) pero el campo se había quedado con el límite
// viejo (600) -- cualquier mensaje mediano rechazaba la búsqueda entera con
// un error de validación. Subido a 8000 para dejar margen a las etiquetas
// HTML (negrita/subrayado/tamaño/alineación) que suman overhead arriba del
// texto visible.
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

  const field = col.fields.find((f) => f.name === "visible_message");
  if (!field) throw new Error("no se encontró el campo `visible_message`");
  if (field.max >= 8000) {
    console.log("`visible_message.max` ya es >= 8000, no hago nada.");
    return;
  }

  const nextFields = col.fields.map((f) => (f.name === "visible_message" ? { ...f, max: 8000 } : f));

  const res = await fetch(`${PB_URL}/api/collections/job_posts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ fields: nextFields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`update job_posts: ${JSON.stringify(data, null, 2)}`);
  console.log("Listo, `visible_message.max` ahora es 8000.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
