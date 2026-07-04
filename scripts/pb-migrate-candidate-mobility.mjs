// Agrega a candidate_profiles los 3 campos que reemplazan a sexo/edad como
// criterio real para elegir candidatos: movilidad propia, disponibilidad
// inmediata, y sueldo pretendido (opcional, solo informativo).
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
  const col = await fetch(`${PB_URL}/api/collections/candidate_profiles`, {
    headers: { Authorization: token },
  }).then((r) => r.json());

  const existingNames = new Set(col.fields.map((f) => f.name));
  const newFields = [
    { name: "has_own_transport", type: "select", required: false, maxSelect: 1, values: ["si", "no"] },
    { name: "immediate_availability", type: "bool", required: false },
    { name: "expected_salary", type: "text", required: false },
  ].filter((f) => !existingNames.has(f.name));

  if (newFields.length === 0) {
    console.log("Los 3 campos ya existen, no hago nada.");
    return;
  }

  const res = await fetch(`${PB_URL}/api/collections/candidate_profiles`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ fields: [...col.fields, ...newFields] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`update candidate_profiles: ${JSON.stringify(data, null, 2)}`);
  console.log("Listo, agregados:", newFields.map((f) => f.name).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
