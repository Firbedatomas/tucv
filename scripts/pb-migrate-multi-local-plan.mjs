// Agrega "multi_local" como valor válido de business_accounts.plan -- el
// tier Multi-sucursal/Franquicias. A diferencia de free/pro, este NO se
// activa self-serve (no hay checkout de Mercado Pago para esto todavía):
// la persona escribe por /contacto y se sube el plan a mano desde el admin
// de PocketBase, mismo camino que ya se usaba para "pro" antes de tener
// Mercado Pago.
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
  const col = await fetch(`${PB_URL}/api/collections/business_accounts`, {
    headers: { Authorization: token },
  }).then((r) => r.json());

  const planField = col.fields.find((f) => f.name === "plan");
  if (!planField) throw new Error("no se encontró el campo `plan`");
  if (planField.values.includes("multi_local")) {
    console.log("`multi_local` ya está en los valores de `plan`, no hago nada.");
    return;
  }

  const nextFields = col.fields.map((f) =>
    f.name === "plan" ? { ...f, values: [...f.values, "multi_local"] } : f,
  );

  const res = await fetch(`${PB_URL}/api/collections/business_accounts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ fields: nextFields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`update business_accounts: ${JSON.stringify(data, null, 2)}`);
  console.log("Listo, `plan` ahora acepta: free, pro, multi_local.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
