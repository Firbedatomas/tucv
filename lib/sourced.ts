import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
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
};
export type SourcedBusinessPublic = {
  id: string;
  slug: string;
  name: string;
  rubro: string;
  cityZone: string;
  sourceType: string;
  detectedAt: string;
  claimed: boolean;
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

  return {
    id: biz.id as string,
    slug: biz.public_slug as string,
    name: biz.name as string,
    rubro: (biz.rubro as string) || "",
    cityZone: (biz.city_zone as string) || "",
    sourceType: (biz.source_type as string) || "",
    detectedAt: biz.created as string,
    claimed: Boolean(biz.claimed_business),
    jobs: jobRows.map((j) => ({
      id: j.id as string,
      role: j.role as string,
      rubro: (j.rubro as string) || "",
      snippet: (j.description_snippet as string) || "",
      detectedAt: j.created as string,
    })),
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

  await admin
    .collection("candidate_interest")
    .create({ sourced_job: sourcedJobId, candidate: candidateId })
    .catch(() => null); // duplicado (mismo candidato) o carrera -> se ignora
  return "ok";
}

export async function countInterest(sourcedJobId: string): Promise<number> {
  const admin = await pbAdmin();
  const res = await admin
    .collection("candidate_interest")
    .getList(1, 1, { filter: admin.filter("sourced_job = {:id}", { id: sourcedJobId }), requestKey: null })
    .catch(() => null);
  return res?.totalItems ?? 0;
}
