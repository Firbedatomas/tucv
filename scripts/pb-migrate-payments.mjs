// Crea la colección `payments` para trackear compras del Plan Pro vía
// Mercado Pago. createRule/updateRule vacíos a propósito (solo superusuario
// -- vía pbAdmin() desde las rutas de checkout/webhook): el negocio nunca
// escribe directo acá, así nadie puede fabricar un pago "aprobado".
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

  const existing = await fetch(`${PB_URL}/api/collections/payments`, { headers: { Authorization: token } });
  if (existing.ok) {
    console.log("`payments` ya existe, no hago nada.");
    return;
  }

  const businessAccounts = await fetch(`${PB_URL}/api/collections/business_accounts`, {
    headers: { Authorization: token },
  }).then((r) => r.json());

  const body = {
    name: "payments",
    type: "base",
    fields: [
      {
        name: "business",
        type: "relation",
        required: true,
        collectionId: businessAccounts.id,
        maxSelect: 1,
        cascadeDelete: false,
      },
      { name: "type", type: "select", required: true, maxSelect: 1, values: ["plan_pro"] },
      { name: "amount", type: "number", required: true },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["pending", "approved", "rejected"],
      },
      { name: "mp_preference_id", type: "text", required: false },
      { name: "mp_payment_id", type: "text", required: false },
    ],
    listRule: "@request.auth.id != \"\" && business.user = @request.auth.id",
    viewRule: "@request.auth.id != \"\" && business.user = @request.auth.id",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  };

  const res = await fetch(`${PB_URL}/api/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`create payments: ${JSON.stringify(data, null, 2)}`);
  console.log("Listo, colección `payments` creada.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
