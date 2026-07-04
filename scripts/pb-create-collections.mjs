// Script de referencia: fue el que generó pocketbase/pb_migrations/ original
// (correr contra una instancia recién creada regenera las mismas colecciones,
// usando automigrate). No hace falta volver a correrlo en un clon del repo:
// las migraciones ya versionadas alcanzan.
const PB_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@tucv.local";
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || "TucvAdmin123!";

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

async function createCollection(token, body) {
  const res = await fetch(`${PB_URL}/api/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${body.name}: ${JSON.stringify(data, null, 2)}`);
  console.log(`created ${body.name} -> ${data.id}`);
  return data;
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

const autodateFields = [
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

async function main() {
  const token = await authAdmin();

  // --- business_accounts ---------------------------------------------
  const businessAccounts = await createCollection(token, {
    name: "business_accounts",
    type: "base",
    fields: [
      {
        name: "user",
        type: "relation",
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
      },
      { name: "business_name", type: "text", required: true, max: 120 },
      { name: "phone", type: "text", required: true, max: 40 },
      { name: "city_zone", type: "text", required: true, max: 120 },
      ...autodateFields,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_business_accounts_user ON business_accounts (user)"],
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "@request.auth.id != \"\" && user = @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: null,
  });

  // --- candidate_profiles ---------------------------------------------
  const candidateProfiles = await createCollection(token, {
    name: "candidate_profiles",
    type: "base",
    fields: [
      { name: "name", type: "text", required: true, max: 120 },
      { name: "whatsapp", type: "text", required: true, max: 40 },
      { name: "city_zone", type: "text", required: true, max: 120 },
      { name: "birth_date", type: "date", required: false },
      { name: "age_manual", type: "number", required: false, min: 14, max: 99, onlyInt: true },
      {
        name: "gender",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["hombre", "mujer", "otro", "prefiero_no_decir"],
      },
      {
        name: "photo",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      {
        name: "categories",
        type: "select",
        required: true,
        maxSelect: 6,
        values: [
          "atencion",
          "ventas",
          "caja",
          "reposicion",
          "limpieza",
          "deposito",
          "reparto",
          "seguridad",
          "cuidado",
          "construccion",
          "mantenimiento",
          "taller_oficio",
          "cocina",
          "moza_mozo",
          "barista",
          "administracion_basica",
          "produccion_operario",
          "otro",
        ],
      },
      { name: "category_other", type: "text", required: false, max: 120 },
      {
        name: "experience",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["sin_experiencia", "menos_6_meses", "6_a_12_meses", "1_a_3_anos", "mas_3_anos"],
      },
      {
        name: "availability",
        type: "select",
        required: true,
        maxSelect: 7,
        values: [
          "manana",
          "tarde",
          "noche",
          "full_time",
          "part_time",
          "fines_semana",
          "feriados",
        ],
      },
      { name: "references_text", type: "text", required: false, max: 500 },
      { name: "bio", type: "text", required: false, max: 400 },
      {
        name: "cv_file",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 10485760,
        mimeTypes: ["application/pdf", "image/jpeg", "image/png"],
      },
      { name: "consent_save", type: "bool", required: true },
      { name: "consent_zone_visible", type: "bool", required: false },
      {
        name: "edit_token",
        type: "text",
        required: true,
        max: 40,
        autogeneratePattern: "[a-zA-Z0-9]{32}",
      },
      ...autodateFields,
    ],
    indexes: [],
    // listRule/viewRule finales (con back-relation a `applications`) se aplican
    // más abajo vía PATCH, una vez que la colección `applications` existe.
    listRule: "@request.auth.id != \"\" && consent_zone_visible = true",
    viewRule: "@request.query.token != \"\" && @request.query.token = edit_token",
    createRule: "consent_save = true",
    updateRule: "@request.query.token != \"\" && @request.query.token = edit_token",
    deleteRule: "@request.query.token != \"\" && @request.query.token = edit_token",
  });

  // --- job_posts --------------------------------------------------------
  const jobPosts = await createCollection(token, {
    name: "job_posts",
    type: "base",
    fields: [
      {
        name: "business",
        type: "relation",
        required: true,
        collectionId: businessAccounts.id,
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
      },
      { name: "name", type: "text", required: true, max: 120 },
      {
        name: "category",
        type: "select",
        required: true,
        maxSelect: 1,
        values: [
          "atencion",
          "ventas",
          "caja",
          "reposicion",
          "limpieza",
          "deposito",
          "reparto",
          "seguridad",
          "cuidado",
          "construccion",
          "mantenimiento",
          "taller_oficio",
          "cocina",
          "moza_mozo",
          "barista",
          "administracion_basica",
          "produccion_operario",
          "otro",
        ],
      },
      { name: "address_zone", type: "text", required: true, max: 200 },
      { name: "role", type: "text", required: true, max: 120 },
      {
        name: "shift",
        type: "select",
        required: true,
        maxSelect: 4,
        values: ["manana", "tarde", "noche", "full_time", "part_time", "fines_semana", "feriados"],
      },
      {
        name: "experience_required",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["sin_experiencia", "menos_6_meses", "6_a_12_meses", "1_a_3_anos", "mas_3_anos"],
      },
      { name: "visible_message", type: "text", required: false, max: 600 },
      { name: "duration_days", type: "select", required: true, maxSelect: 1, values: ["15", "30"] },
      { name: "expires_at", type: "date", required: true },
      { name: "active", type: "bool", required: false },
      { name: "slug", type: "text", required: true, max: 60, pattern: "^[a-z0-9-]+$" },
      ...autodateFields,
    ],
    indexes: ["CREATE UNIQUE INDEX idx_job_posts_slug ON job_posts (slug)"],
    listRule: "@request.auth.id != \"\" && business.user = @request.auth.id",
    viewRule: "",
    createRule: "@request.auth.id != \"\" && business.user = @request.auth.id",
    updateRule: "@request.auth.id != \"\" && business.user = @request.auth.id",
    deleteRule: "@request.auth.id != \"\" && business.user = @request.auth.id",
  });

  // --- applications -------------------------------------------------------
  const applications = await createCollection(token, {
    name: "applications",
    type: "base",
    fields: [
      {
        name: "job_post",
        type: "relation",
        required: true,
        collectionId: jobPosts.id,
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
      },
      {
        name: "candidate",
        type: "relation",
        required: true,
        collectionId: candidateProfiles.id,
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
      },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["nuevo", "contactado", "entrevista", "contratado", "descartado"],
      },
      ...autodateFields,
    ],
    indexes: [],
    listRule: "@request.auth.id != \"\" && job_post.business.user = @request.auth.id",
    viewRule: "@request.auth.id != \"\" && job_post.business.user = @request.auth.id",
    createRule: "job_post.active = true",
    updateRule: "@request.auth.id != \"\" && job_post.business.user = @request.auth.id",
    deleteRule: null,
  });

  // --- application_status_events ------------------------------------------
  await createCollection(token, {
    name: "application_status_events",
    type: "base",
    fields: [
      {
        name: "application",
        type: "relation",
        required: true,
        collectionId: applications.id,
        cascadeDelete: true,
        minSelect: 1,
        maxSelect: 1,
      },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["nuevo", "contactado", "entrevista", "contratado", "descartado"],
      },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: [],
    listRule: "@request.auth.id != \"\" && application.job_post.business.user = @request.auth.id",
    viewRule: "@request.auth.id != \"\" && application.job_post.business.user = @request.auth.id",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });

  // --- consent_logs -----------------------------------------------------
  await createCollection(token, {
    name: "consent_logs",
    type: "base",
    fields: [
      {
        name: "candidate",
        type: "relation",
        required: false,
        collectionId: candidateProfiles.id,
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        name: "type",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["save_profile", "zone_visible"],
      },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: [],
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });

  // Ahora que `applications` existe, habilitamos en candidate_profiles el
  // acceso de la empresa a los perfiles de quienes aplicaron a sus búsquedas.
  await patchCollection(token, candidateProfiles.id, {
    listRule:
      '@request.auth.id != "" && (consent_zone_visible = true || applications_via_candidate.job_post.business.user ?= @request.auth.id)',
    viewRule:
      '(@request.query.token != "" && @request.query.token = edit_token) || (@request.auth.id != "" && applications_via_candidate.job_post.business.user ?= @request.auth.id)',
  });

  console.log("Listo. Revisar pb_migrations/ para los archivos generados.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
