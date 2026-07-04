// Agrega "job_extend" a payments.type -- pago único que extiende
// expires_at de una búsqueda del plan gratis ya vencida (o por vencer),
// sin tocar su slug/QR/link.
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
  const col = await fetch(`${PB_URL}/api/collections/payments`, {
    headers: { Authorization: token },
  }).then((r) => r.json());

  const typeField = col.fields.find((f) => f.name === "type");
  if (!typeField) throw new Error("no se encontró el campo `type`");
  if (typeField.values.includes("job_extend")) {
    console.log("`job_extend` ya está en los valores de `type`, no hago nada.");
    return;
  }

  const nextFields = col.fields.map((f) =>
    f.name === "type" ? { ...f, values: [...f.values, "job_extend"] } : f,
  );

  const res = await fetch(`${PB_URL}/api/collections/payments`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ fields: nextFields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`update payments: ${JSON.stringify(data, null, 2)}`);
  console.log("Listo, `payments.type` ahora acepta también: job_extend.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
