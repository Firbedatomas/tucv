// Agrega "osm" a los valores permitidos de sourced_businesses.source_type,
// para poder sembrar desde OpenStreetMap (scripts/capture-osm.mjs).
//
// Sin esto, PocketBase rechaza cada create con
// `validation_invalid_value: Invalid value osm` (HTTP 400). Es el mismo tipo
// de bloqueo que tenía email_events.type con el outreach: un select cerrado
// que hay que ampliar antes de poder escribir.
//
// Idempotente.
const PB_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

const NUEVO = "osm";

async function main() {
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const auth = await authRes.json();
  if (!authRes.ok) throw new Error(JSON.stringify(auth));
  const token = auth.token;

  const res = await fetch(`${PB_URL}/api/collections/sourced_businesses`, { headers: { Authorization: token } });
  const col = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(col));

  const campo = col.fields.find((f) => f.name === "source_type");
  if (!campo) throw new Error("sourced_businesses no tiene campo `source_type`");
  if ((campo.values || []).includes(NUEVO)) {
    console.log(`source_type ya incluye "${NUEVO}".`);
    return;
  }

  const fields = col.fields.map((f) =>
    f.name === "source_type" ? { ...f, values: [...(f.values || []), NUEVO] } : f,
  );
  const patch = await fetch(`${PB_URL}/api/collections/sourced_businesses`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ fields }),
  });
  const body = await patch.json();
  if (!patch.ok) throw new Error(`patch: ${JSON.stringify(body, null, 2)}`);
  console.log(`source_type: agregado "${NUEVO}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
