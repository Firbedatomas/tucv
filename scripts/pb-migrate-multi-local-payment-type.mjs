// Agrega "multi_local" a payments.type -- el negocio ahora puede pagar el
// plan Multi-sucursal self-serve, igual que plan_pro, en vez de pedirlo por
// contacto y subirlo a mano.
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
  if (typeField.values.includes("multi_local")) {
    console.log("`multi_local` ya está en los valores de `type`, no hago nada.");
    return;
  }

  const nextFields = col.fields.map((f) =>
    f.name === "type" ? { ...f, values: [...f.values, "multi_local"] } : f,
  );

  const res = await fetch(`${PB_URL}/api/collections/payments`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ fields: nextFields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`update payments: ${JSON.stringify(data, null, 2)}`);
  console.log("Listo, `payments.type` ahora acepta: plan_pro, job_boost, multi_local.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
