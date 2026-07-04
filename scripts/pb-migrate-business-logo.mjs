// Agrega `logo` (file, imagen) a business_accounts.
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
  const res = await fetch(`${PB_URL}/api/collections/business_accounts`, { headers: { Authorization: token } });
  const businessAccounts = await res.json();

  if (businessAccounts.fields.some((f) => f.name === "logo")) {
    console.log("`logo` ya existe en business_accounts, no hago nada.");
    return;
  }

  const fields = [
    ...businessAccounts.fields,
    {
      name: "logo",
      type: "file",
      required: false,
      maxSelect: 1,
      maxSize: 5242880,
      mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    },
  ];

  const patchRes = await fetch(`${PB_URL}/api/collections/business_accounts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ fields }),
  });
  const patchBody = await patchRes.json();
  if (!patchRes.ok) throw new Error(`patch business_accounts: ${JSON.stringify(patchBody, null, 2)}`);
  console.log("Listo, `logo` agregado a business_accounts.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
