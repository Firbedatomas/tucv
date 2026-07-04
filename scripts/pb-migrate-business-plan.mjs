// Agrega `plan` (free/pro) a business_accounts. Correr una sola vez.
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

async function getCollection(token, idOrName) {
  const res = await fetch(`${PB_URL}/api/collections/${idOrName}`, { headers: { Authorization: token } });
  return res.json();
}

async function patchCollection(token, idOrName, body) {
  const res = await fetch(`${PB_URL}/api/collections/${idOrName}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`patch ${idOrName}: ${JSON.stringify(data, null, 2)}`);
  console.log(`patched ${idOrName}`);
  return data;
}

async function main() {
  const token = await authAdmin();
  const businessAccounts = await getCollection(token, "business_accounts");

  if (businessAccounts.fields.some((f) => f.name === "plan")) {
    console.log("`plan` ya existe en business_accounts, no hago nada.");
    return;
  }

  const fields = [...businessAccounts.fields];
  fields.push({
    name: "plan",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["free", "pro"],
  });

  await patchCollection(token, "business_accounts", { fields });
  console.log("Listo. Las cuentas sin `plan` seteado se tratan como 'free' en el código.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
