// Carga datos de ejemplo: 1 empleador, 2 búsquedas, 10 postulantes (con
// algunas postulaciones ya hechas, para poder ver el panel con contenido
// real apenas se levanta el proyecto).
//
// Uso:
//   node scripts/seed.js
//
// Requiere PocketBase corriendo (ver README) y las migraciones ya aplicadas
// (se aplican solas al arrancar `pocketbase serve`).
//
// El login real de la app es solo Google (ver pb_hooks/main.pb.js), así que
// este script no puede "loguearse" como los usuarios demo -- en cambio
// autentica como SUPERUSUARIO (PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD, igual que
// lib/pocketbase-admin.ts) y crea los registros de `users` directamente,
// bypaseando las reglas de la colección. Esos `users` demo quedan con un
// password interno que nunca se usa (no hay endpoint de password habilitado
// para probarlo) -- para entrar de verdad a la app hace falta una cuenta de
// Google real.
import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;
const EMPLOYER_EMAIL = "empleador-demo@tucv.local";
// Password interno, nunca se usa para loguearse (login real es solo Google).
const DEMO_PASSWORD = "DemoTucvNoLogin123!";

async function findOrCreateUser(pb, email, name) {
  const existing = await pb
    .collection("users")
    .getFirstListItem(`email="${email}"`)
    .catch(() => null);
  if (existing) return existing;
  return pb.collection("users").create({
    email,
    name,
    emailVisibility: true,
    verified: true,
    password: DEMO_PASSWORD,
    passwordConfirm: DEMO_PASSWORD,
  });
}

const EXPERIENCE_RANK = {
  sin_experiencia: 0,
  menos_6_meses: 1,
  "6_a_12_meses": 2,
  "1_a_3_anos": 3,
  mas_3_anos: 4,
};

function highestExperience(values) {
  return values.reduce(
    (best, v) => ((EXPERIENCE_RANK[v] ?? 0) > (EXPERIENCE_RANK[best] ?? 0) ? v : best),
    "sin_experiencia",
  );
}

// Mismo criterio que lib/profile-slug.ts (duplicado acá a propósito: este
// script es plano .js sin acceso directo a los módulos TS de la app).
function slugifyName(firstName, lastName) {
  const raw = `${firstName} ${lastName}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || "postulante";
}

async function uniqueProfileSlug(pb, firstName, lastName, excludeId) {
  const base = slugifyName(firstName, lastName);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const filter = excludeId
      ? `profile_slug="${candidate}" && id!="${excludeId}"`
      : `profile_slug="${candidate}"`;
    const taken = await pb.collection("candidate_profiles").getFirstListItem(filter).catch(() => null);
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}

const CANDIDATES = [
  {
    first_name: "Juana",
    last_name: "Pérez",
    name: "Juana Pérez",
    whatsapp: "+5491122334455",
    city_zone: "Palermo, CABA",
    birth_date: "1998-04-12",
    gender: "mujer",
    category_experience: [
      { category: "atencion", experience: "1_a_3_anos" },
      { category: "ventas", experience: "6_a_12_meses" },
    ],
    availability: ["tarde", "part_time"],
    references: [{ name: "Ana", relation: "ex encargada en Almacén Norte", phone: "11 5555 1111" }],
    studies: [{ level: "secundario", status: "completo", institution: "" }],
    bio: "Responsable y con buena onda para atender público.",
    consent_zone_visible: true,
  },
  {
    first_name: "Martín",
    last_name: "Ruiz",
    name: "Martín Ruiz",
    whatsapp: "+5491122334456",
    city_zone: "Chacarita, CABA",
    birth_date: "2002-03-15",
    gender: "hombre",
    category_experience: [
      { category: "deposito", experience: "6_a_12_meses" },
      { category: "reparto", experience: "1_a_3_anos" },
    ],
    availability: ["manana", "full_time"],
    references: [],
    studies: [],
    bio: "Rápido con el orden de depósito, tengo moto propia.",
    consent_zone_visible: false,
  },
  {
    first_name: "Sol",
    last_name: "Gómez",
    name: "Sol Gómez",
    whatsapp: "+5491122334457",
    city_zone: "Villa Crespo, CABA",
    birth_date: "2003-11-02",
    gender: "mujer",
    category_experience: [
      { category: "caja", experience: "sin_experiencia" },
      { category: "administracion_basica", experience: "sin_experiencia" },
    ],
    availability: ["fines_semana", "tarde"],
    references: [],
    studies: [
      { level: "secundario", status: "completo", institution: "" },
      { level: "terciario", status: "incompleto", institution: "" },
    ],
    bio: "Estudiante, busco mi primer trabajo formal.",
    consent_zone_visible: true,
  },
  {
    first_name: "Diego",
    last_name: "Fernández",
    name: "Diego Fernández",
    whatsapp: "+5491122334458",
    city_zone: "Almagro, CABA",
    birth_date: "1991-06-08",
    gender: "hombre",
    category_experience: [
      { category: "mantenimiento", experience: "mas_3_anos" },
      { category: "taller_oficio", experience: "mas_3_anos" },
      { category: "electricidad", experience: "mas_3_anos" },
    ],
    availability: ["full_time"],
    references: [{ name: "Roberto", relation: "dueño de Ferretería Sur", phone: "11 5555 2222" }],
    studies: [{ level: "terciario", status: "completo", institution: "" }],
    bio: "Electricista y gasista matriculado.",
    consent_zone_visible: false,
  },
  {
    first_name: "Camila",
    last_name: "Torres",
    name: "Camila Torres",
    whatsapp: "+5491122334459",
    city_zone: "Palermo, CABA",
    birth_date: "2000-07-20",
    gender: "mujer",
    category_experience: [
      { category: "caja", experience: "1_a_3_anos" },
      { category: "ventas", experience: "1_a_3_anos" },
    ],
    availability: ["tarde", "noche", "fines_semana"],
    references: [{ name: "Lucía", relation: "ex compañera de turno", phone: "11 5555 3333" }],
    studies: [],
    bio: "Cajera con caja registradora y mercado pago.",
    consent_zone_visible: true,
  },
  {
    first_name: "Nahuel",
    last_name: "Castro",
    name: "Nahuel Castro",
    whatsapp: "+5491122334460",
    city_zone: "Villa Urquiza, CABA",
    birth_date: "2007-01-30",
    gender: "hombre",
    category_experience: [
      { category: "reposicion", experience: "menos_6_meses" },
      { category: "deposito", experience: "sin_experiencia" },
    ],
    availability: ["manana", "part_time"],
    references: [],
    studies: [{ level: "secundario", status: "incompleto", institution: "" }],
    bio: "",
    consent_zone_visible: false,
  },
  {
    first_name: "Valentina",
    last_name: "López",
    name: "Valentina López",
    whatsapp: "+5491122334461",
    city_zone: "Chacarita, CABA",
    birth_date: "1995-02-28",
    gender: "mujer",
    category_experience: [
      { category: "cuidado", experience: "mas_3_anos" },
      { category: "atencion", experience: "1_a_3_anos" },
      { category: "ninera", experience: "mas_3_anos" },
    ],
    availability: ["full_time", "feriados"],
    references: [{ name: "Familia Rodríguez", relation: "cuidé a su papá 2 años", phone: "11 5555 4444" }],
    studies: [{ level: "secundario", status: "completo", institution: "" }],
    bio: "Cuidadora con experiencia en adultos mayores.",
    consent_zone_visible: true,
  },
  {
    first_name: "Federico",
    last_name: "Sosa",
    name: "Federico Sosa",
    whatsapp: "+5491122334462",
    city_zone: "Palermo, CABA",
    birth_date: "1997-10-11",
    gender: "hombre",
    category_experience: [{ category: "seguridad", experience: "1_a_3_anos" }],
    availability: ["noche", "fines_semana"],
    references: [],
    studies: [],
    bio: "Curso de seguridad privada aprobado.",
    consent_zone_visible: false,
  },
  {
    first_name: "Rocío",
    last_name: "Medina",
    name: "Rocío Medina",
    whatsapp: "+5491122334463",
    city_zone: "Villa Crespo, CABA",
    birth_date: "1999-09-09",
    gender: "mujer",
    category_experience: [
      { category: "produccion_operario", experience: "6_a_12_meses" },
      { category: "administracion_basica", experience: "menos_6_meses" },
    ],
    availability: ["manana", "tarde"],
    references: [],
    studies: [],
    bio: "Prolija, buena con planillas y stock.",
    consent_zone_visible: true,
  },
  {
    first_name: "Tomás",
    last_name: "Ibáñez",
    name: "Tomás Ibáñez",
    whatsapp: "+5491122334464",
    city_zone: "Almagro, CABA",
    birth_date: "2004-05-17",
    gender: "prefiero_no_decir",
    category_experience: [
      { category: "reparto", experience: "sin_experiencia" },
      { category: "delivery_moto", experience: "sin_experiencia" },
    ],
    availability: ["full_time", "fines_semana"],
    references: [],
    studies: [],
    bio: "Tengo bici y ganas de laburar.",
    consent_zone_visible: false,
  },
];

async function main() {
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    throw new Error("Faltan PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD (ver .env.local.example).");
  }

  const pb = new PocketBase(POCKETBASE_URL);
  await pb.collection("_superusers").authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);

  console.log(`Sembrando datos contra ${POCKETBASE_URL}...`);

  // --- Empleador ---
  const employerUser = await findOrCreateUser(pb, EMPLOYER_EMAIL, "Empleador Demo");
  const employerUserId = employerUser.id;

  let business = await pb
    .collection("business_accounts")
    .getFirstListItem(`user="${employerUserId}"`)
    .catch(() => null);
  if (!business) {
    business = await pb.collection("business_accounts").create({
      user: employerUserId,
      contact_name: "José Demo",
      business_name: "Almacén Don José",
      phone: "+5491100000000",
      city_zone: "Palermo, CABA",
    });
  }
  console.log("Negocio:", business.business_name);

  // --- Búsquedas ---
  const jobsData = [
    {
      name: "Cajero/a fin de semana",
      category: "caja",
      address_zone: "Av. Santa Fe 3200, Palermo, CABA",
      role: "Cajero/a",
      shift: ["fines_semana", "tarde"],
      experience_required: "sin_experiencia",
      perks: ["obra_social", "en_blanco"],
      visible_message: "Buscamos alguien con buena predisposición para atender los findes.",
      duration_days: "30",
      slug: "almacen-don-jose-cajero-findes",
    },
    {
      name: "Repositor/a turno mañana",
      category: "reposicion",
      address_zone: "Av. Santa Fe 3200, Palermo, CABA",
      role: "Repositor/a",
      shift: ["manana", "full_time"],
      experience_required: "menos_6_meses",
      perks: ["en_blanco"],
      visible_message: "Trabajo de mañana, ideal para empezar. Buen ambiente de equipo.",
      duration_days: "15",
      slug: "almacen-don-jose-repositor-manana",
    },
  ];

  const jobs = [];
  for (const jobData of jobsData) {
    let job = await pb
      .collection("job_posts")
      .getFirstListItem(`slug="${jobData.slug}"`)
      .catch(() => null);
    if (!job) {
      job = await pb.collection("job_posts").create({ business: business.id, ...jobData });
    }
    jobs.push(job);
    console.log("Búsqueda:", job.name, "->", `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/b/${job.slug}`);
  }

  // --- Postulantes (cada uno con su propio `users`, igual que en producción) ---
  // Si ya existe un registro de una corrida vieja del script (antes de
  // user/profile_slug/studies/first_name), lo completamos en vez de
  // dejarlo pegado con el esquema viejo -- si no, ninguno de estos perfiles
  // demo tiene URL pública ni queda vinculado a una cuenta real.
  const candidateRecords = [];
  for (const [index, c] of CANDIDATES.entries()) {
    const email = `postulante-demo-${index + 1}@tucv.local`;
    const candidateUser = await findOrCreateUser(pb, email, c.name);
    const categories = c.category_experience.map((ce) => ce.category);
    const experience = highestExperience(c.category_experience.map((ce) => ce.experience));

    let record = await pb
      .collection("candidate_profiles")
      .getFirstListItem(`whatsapp="${c.whatsapp}"`)
      .catch(() => null);

    if (!record) {
      const profile_slug = await uniqueProfileSlug(pb, c.first_name, c.last_name);
      record = await pb.collection("candidate_profiles").create({
        ...c,
        user: candidateUser.id,
        categories,
        experience,
        profile_slug,
        consent_save: true,
      });
    } else if (!record.user || !record.profile_slug || !record.first_name) {
      const profile_slug = record.profile_slug || (await uniqueProfileSlug(pb, c.first_name, c.last_name, record.id));
      // Se pisa `studies`/`references` sin condición: esto es dataset demo
      // fijo (matchea por email postulante-demo-N@tucv.local), no perfiles
      // reales editados a mano -- así el backfill deja el formato viejo
      // (referencias como texto libre) convertido al nuevo.
      record = await pb.collection("candidate_profiles").update(record.id, {
        user: record.user || candidateUser.id,
        first_name: record.first_name || c.first_name,
        last_name: record.last_name || c.last_name,
        profile_slug,
        studies: c.studies,
        references: c.references,
      });
    }
    candidateRecords.push(record);
  }
  console.log(`Postulantes: ${candidateRecords.length}`);

  // --- Postulaciones: repartimos los 10 candidatos entre las 2 búsquedas,
  // con algo de superposición, y variamos el estado para que el panel se
  // vea con contenido real desde el primer momento.
  const applicationsPlan = [
    { candidateIndex: 0, jobIndex: 0, status: "nuevo" },
    { candidateIndex: 2, jobIndex: 0, status: "contactado" },
    { candidateIndex: 4, jobIndex: 0, status: "entrevista" },
    { candidateIndex: 6, jobIndex: 0, status: "nuevo" },
    { candidateIndex: 7, jobIndex: 0, status: "descartado" },
    { candidateIndex: 8, jobIndex: 0, status: "nuevo" },
    { candidateIndex: 1, jobIndex: 1, status: "nuevo" },
    { candidateIndex: 3, jobIndex: 1, status: "contratado" },
    { candidateIndex: 5, jobIndex: 1, status: "nuevo" },
    { candidateIndex: 8, jobIndex: 1, status: "contactado" },
    { candidateIndex: 9, jobIndex: 1, status: "nuevo" },
  ];

  let createdApplications = 0;
  for (const plan of applicationsPlan) {
    const candidate = candidateRecords[plan.candidateIndex];
    const job = jobs[plan.jobIndex];
    const existing = await pb
      .collection("applications")
      .getFirstListItem(`candidate="${candidate.id}" && job_post="${job.id}"`)
      .catch(() => null);
    if (existing) {
      if (existing.status !== plan.status) {
        await pb.collection("applications").update(existing.id, { status: plan.status });
      }
      continue;
    }
    const application = await pb.collection("applications").create({
      candidate: candidate.id,
      job_post: job.id,
      status: "nuevo",
    });
    if (plan.status !== "nuevo") {
      await pb.collection("applications").update(application.id, { status: plan.status });
    }
    createdApplications++;
  }
  console.log(`Postulaciones creadas: ${createdApplications} (de ${applicationsPlan.length} planeadas)`);

  console.log(`\nListo. El empleador demo (${EMPLOYER_EMAIL}) y los ${CANDIDATES.length} postulantes`);
  console.log("demo quedaron creados, pero el login de la app es solo Google -- para entrar de");
  console.log("verdad a cualquiera de estas cuentas hace falta vincularlas a un Gmail real desde");
  console.log("el Admin UI de PocketBase, o simplemente loguearte con tu propia cuenta de Google");
  console.log("(se crea una cuenta nueva en el primer login).");
}

main().catch((err) => {
  console.error("Error sembrando datos:", err);
  process.exit(1);
});
