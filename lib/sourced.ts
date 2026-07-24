import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { notifyTelegram } from "@/lib/telegram";
import { waLink } from "@/lib/whatsapp";
import { resolveUserIdFromToken } from "@/lib/candidate-session";

// Proyección PÚBLICA de una empresa detectada. Expone SOLO lo mostrable: nombre,
// rubro, zona, de qué fuente salió y cuándo. NUNCA contact_email/contact_phone/
// evidence/notes/source_url (datos internos de outreach) -- mismo criterio que
// public-job/public-profile.
export type SourcedJobPublic = {
  id: string;
  role: string;
  rubro: string;
  snippet: string;
  detectedAt: string;
  interestCount: number;
};
export type SourcedBusinessPublic = {
  id: string;
  slug: string;
  name: string;
  rubro: string;
  cityZone: string;
  sourceType: string;
  sourceUrl: string;
  website: string;
  instagram: string;
  detectedAt: string;
  claimed: boolean;
  logoUrl: string;
  totalInterest: number;
  jobs: SourcedJobPublic[];
};

export async function getSourcedBusinessBySlug(slug: string): Promise<SourcedBusinessPublic | null> {
  if (!slug) return null;
  const admin = await pbAdmin();
  const biz = await admin
    .collection("sourced_businesses")
    .getFirstListItem(admin.filter("public_slug = {:slug} && status != {:opt}", { slug, opt: "opted_out" }), {
      requestKey: null,
    })
    .catch(() => null);
  if (!biz) return null;

  const jobRows = await admin
    .collection("sourced_jobs")
    .getFullList({
      filter: admin.filter("sourced_business = {:id} && status != {:exp}", { id: biz.id, exp: "expired" }),
      sort: "-created",
      requestKey: null,
    })
    .catch(() => []);

  // Interés por búsqueda (prueba social). Traemos todos los intereses de las
  // búsquedas de esta empresa de una y contamos en memoria.
  const interestByJob = new Map<string, number>();
  if (jobRows.length) {
    const or = jobRows.map((j) => `sourced_job = "${j.id}"`).join(" || ");
    const interests = await admin
      .collection("candidate_interest")
      .getFullList({ filter: or, requestKey: null })
      .catch(() => []);
    for (const it of interests) {
      const k = it.sourced_job as string;
      interestByJob.set(k, (interestByJob.get(k) ?? 0) + 1);
    }
  }

  const jobs = jobRows.map((j) => ({
    id: j.id as string,
    role: j.role as string,
    rubro: (j.rubro as string) || "",
    snippet: (j.description_snippet as string) || "",
    detectedAt: j.created as string,
    interestCount: interestByJob.get(j.id) ?? 0,
  }));

  return {
    id: biz.id as string,
    slug: biz.public_slug as string,
    name: biz.name as string,
    rubro: (biz.rubro as string) || "",
    cityZone: (biz.city_zone as string) || "",
    sourceType: (biz.source_type as string) || "",
    sourceUrl: (biz.source_url as string) || "",
    website: (biz.website as string) || "",
    instagram: (biz.instagram as string) || "",
    detectedAt: biz.created as string,
    claimed: Boolean(biz.claimed_business),
    logoUrl: (biz.logo_url as string) || "",
    totalInterest: jobs.reduce((s, j) => s + j.interestCount, 0),
    jobs,
  };
}

// Registra el interés de un candidato en una búsqueda no verificada. La
// identidad la resuelve el SERVER desde el token (nunca se confía en un
// candidateId del cliente -> evita IDOR). Anónimo (sin token) también cuenta.
// Best-effort + idempotente por el índice único (sourced_job, candidate).
export async function recordInterest(sourcedJobId: string, token?: string | null): Promise<"ok" | "not_found"> {
  const admin = await pbAdmin();
  const job = await admin.collection("sourced_jobs").getOne(sourcedJobId, { requestKey: null }).catch(() => null);
  if (!job) return "not_found";

  let candidateId: string | null = null;
  if (token) {
    const userId = await resolveUserIdFromToken(token).catch(() => null);
    if (userId) {
      const profile = await admin
        .collection("candidate_profiles")
        .getFirstListItem(admin.filter("user = {:u}", { u: userId }), { requestKey: null })
        .catch(() => null);
      candidateId = (profile?.id as string) || null;
    }
  }

  const creado = await admin
    .collection("candidate_interest")
    .create({ sourced_job: sourcedJobId, candidate: candidateId })
    .catch(() => null); // duplicado (mismo candidato) o carrera -> se ignora

  // Aviso inmediato: este es el lead más caliente que existe acá -- alguien
  // quiere trabajar en un negocio que ni siquiera está en TuCV. Hasta ahora
  // quedaba en una tabla que nadie miraba (medido el 2026-07-24: 19 negocios
  // con interés acumulado y CERO contactados), y un lead se enfría en horas.
  // Solo se avisa del interés nuevo, no de un duplicado ignorado.
  if (creado) {
    void avisarLeadCaliente(admin, job.sourced_business as string).catch(() => {});
  }
  return "ok";
}

// Best-effort y fuera del camino de la request: si Telegram falla, el interés
// ya quedó registrado igual.
async function avisarLeadCaliente(
  admin: Awaited<ReturnType<typeof pbAdmin>>,
  sourcedBusinessId: string,
): Promise<void> {
  if (!sourcedBusinessId) return;
  const biz = await admin
    .collection("sourced_businesses")
    .getOne(sourcedBusinessId, { requestKey: null })
    .catch(() => null);
  if (!biz || biz.status === "opted_out" || biz.claimed_business) return;

  const total = await contarInteresDeNegocio(admin, sourcedBusinessId);
  const nombre = (biz.name as string) || "un negocio";
  const zona = (biz.city_zone as string) || "";
  const tel = (biz.contact_phone as string) || "";
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

  const lineas = [
    `Lead caliente: ${total} ${total === 1 ? "persona quiere" : "personas quieren"} trabajar en ${nombre}${zona ? ` (${zona})` : ""}.`,
    tel ? `WhatsApp: ${waLink(tel, mensajeOutreach(nombre, total))}` : "Sin teléfono cargado.",
    `Cola: ${base}/admin/captacion`,
  ];
  await notifyTelegram(lineas.join("\n"));
}

async function contarInteresDeNegocio(
  admin: Awaited<ReturnType<typeof pbAdmin>>,
  sourcedBusinessId: string,
): Promise<number> {
  const jobs = await admin
    .collection("sourced_jobs")
    .getFullList<{ id: string }>({
      filter: admin.filter("sourced_business = {:b}", { b: sourcedBusinessId }),
      fields: "id",
      requestKey: null,
    })
    .catch(() => []);
  if (!jobs.length) return 0;
  const filtro = jobs.map((j) => `sourced_job = "${j.id}"`).join(" || ");
  const { totalItems } = await admin
    .collection("candidate_interest")
    .getList(1, 1, { filter: filtro, requestKey: null })
    .catch(() => ({ totalItems: 0 }));
  return totalItems;
}

/** Mensaje de outreach, compartido entre el aviso de Telegram y el panel. */
export function mensajeOutreach(nombre: string, interesados: number): string {
  const gente = interesados === 1 ? "1 persona de tu zona quiere" : `${interesados} personas de tu zona quieren`;
  return (
    `Hola! Soy de TuCV. ${gente} trabajar en ${nombre}. ` +
    `Les armamos un perfil gratis para que puedas verlos y contactarlos, sin costo y sin vueltas. ` +
    `¿Te paso el link?`
  );
}

// Lista PÚBLICA de oportunidades detectadas (para que los candidatos las
// descubran). Solo empresas NO reclamadas y NO dadas de baja, con búsquedas
// activas. Proyección segura: nombre, rubro, zona, puesto y el slug para ir a
// la página -- nada de contacto/evidence interno.
export type DetectedOpportunity = {
  jobId: string;
  role: string;
  rubro: string;
  businessName: string;
  businessSlug: string;
  cityZone: string;
  sourceType: string;
  logoUrl: string;
};

export async function listDetectedOpportunities(limit = 200): Promise<DetectedOpportunity[]> {
  const admin = await pbAdmin();
  const jobs = await admin
    .collection("sourced_jobs")
    .getFullList({
      filter: admin.filter("status = {:s}", { s: "detected" }),
      expand: "sourced_business",
      sort: "-created",
      requestKey: null,
    })
    .catch(() => []);

  const out: DetectedOpportunity[] = [];
  for (const j of jobs) {
    const b = (j.expand as { sourced_business?: Record<string, unknown> } | undefined)?.sourced_business;
    if (!b || b.status === "opted_out" || b.claimed_business) continue;
    out.push({
      jobId: j.id as string,
      role: j.role as string,
      rubro: (j.rubro as string) || (b.rubro as string) || "",
      businessName: b.name as string,
      businessSlug: (b.public_slug as string) || "",
      cityZone: (b.city_zone as string) || "",
      sourceType: (b.source_type as string) || "",
      logoUrl: (b.logo_url as string) || "",
    });
    if (out.length >= limit) break;
  }
  return out;
}

// Candidatos que mostraron interés en las búsquedas detectadas de un negocio YA
// reclamado -> se le muestran en el panel (cumple el gancho "reclamá para ver los
// interesados"). Proyección segura: nada de whatsapp/DNI (NEVER_PUBLIC_FIELDS).
export type InterestedCandidate = { id: string; name: string; slug: string; cityZone: string };

export async function getBusinessDetectedInterest(
  businessAccountId: string,
): Promise<{ total: number; candidates: InterestedCandidate[] }> {
  const admin = await pbAdmin();
  const sb = await admin
    .collection("sourced_businesses")
    .getFirstListItem(admin.filter("claimed_business = {:b}", { b: businessAccountId }), { requestKey: null })
    .catch(() => null);
  if (!sb) return { total: 0, candidates: [] };

  const jobs = await admin
    .collection("sourced_jobs")
    .getFullList({ filter: admin.filter("sourced_business = {:id}", { id: sb.id }), requestKey: null })
    .catch(() => []);
  if (!jobs.length) return { total: 0, candidates: [] };

  const or = jobs.map((j) => `sourced_job = "${j.id}"`).join(" || ");
  const interests = await admin
    .collection("candidate_interest")
    .getFullList({ filter: or, expand: "candidate", sort: "-created", requestKey: null })
    .catch(() => []);

  const seen = new Set<string>();
  const candidates: InterestedCandidate[] = [];
  for (const it of interests) {
    const c = (it.expand as { candidate?: Record<string, unknown> } | undefined)?.candidate;
    if (!c || seen.has(c.id as string)) continue;
    seen.add(c.id as string);
    candidates.push({
      id: c.id as string,
      name: (c.name as string) || "Candidato",
      slug: (c.profile_slug as string) || "",
      cityZone: (c.city_zone as string) || "",
    });
  }
  return { total: interests.length, candidates };
}

export async function countInterest(sourcedJobId: string): Promise<number> {
  const admin = await pbAdmin();
  const res = await admin
    .collection("candidate_interest")
    .getList(1, 1, { filter: admin.filter("sourced_job = {:id}", { id: sourcedJobId }), requestKey: null })
    .catch(() => null);
  return res?.totalItems ?? 0;
}
