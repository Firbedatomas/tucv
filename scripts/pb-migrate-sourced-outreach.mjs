// Habilita el outreach por mail a empresas detectadas
// (app/api/cron/sourced-outreach). Dos cambios, los dos necesarios para poder
// NO repetir envíos -- sin ellos el endpoint se niega a mandar, a propósito:
//
//   1. email_events.type: agrega "sourced_interest_outreach" al select. Sin
//      esto el log del envío falla en silencio (lib/email/log.ts se traga el
//      error para no romper la cola) y no queda registro de a quién se le
//      escribió.
//   2. sourced_businesses.last_outreach_at: fecha del último mail, que es
//      contra lo que compara el filtro de "no escribirle dos veces en 30 días".
//
// Idempotente: se puede correr las veces que haga falta.
const PB_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

const NUEVO_TIPO = "sourced_interest_outreach";

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

async function getCollection(token, nombre) {
  const res = await fetch(`${PB_URL}/api/collections/${nombre}`, { headers: { Authorization: token } });
  const data = await res.json();
  if (!res.ok) throw new Error(`get ${nombre}: ${JSON.stringify(data)}`);
  return data;
}

async function patchFields(token, nombre, fields) {
  const res = await fetch(`${PB_URL}/api/collections/${nombre}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`patch ${nombre}: ${JSON.stringify(data, null, 2)}`);
}

async function main() {
  const token = await authAdmin();

  // 1. email_events.type
  const events = await getCollection(token, "email_events");
  const tipo = events.fields.find((f) => f.name === "type");
  if (!tipo) throw new Error("email_events no tiene campo `type`");
  if (tipo.values?.includes(NUEVO_TIPO)) {
    console.log(`email_events.type ya incluye "${NUEVO_TIPO}".`);
  } else {
    const fields = events.fields.map((f) =>
      f.name === "type" ? { ...f, values: [...(f.values || []), NUEVO_TIPO] } : f,
    );
    await patchFields(token, "email_events", fields);
    console.log(`email_events.type: agregado "${NUEVO_TIPO}".`);
  }

  // 2. sourced_businesses.last_outreach_at
  const sourced = await getCollection(token, "sourced_businesses");
  if (sourced.fields.some((f) => f.name === "last_outreach_at")) {
    console.log("sourced_businesses.last_outreach_at ya existe.");
  } else {
    const fields = [...sourced.fields, { name: "last_outreach_at", type: "date", required: false }];
    await patchFields(token, "sourced_businesses", fields);
    console.log("sourced_businesses: agregado `last_outreach_at`.");
  }

  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
