import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { getOrCreatePreferences } from "@/lib/email/preferences";
import { sendTransactionalEmail } from "@/lib/email/send";
import { buildCandidateWeeklyProfileViewsEmail } from "@/lib/email/templates/candidate-weekly-profile-views";
import { buildCompanyWeeklyJobDigestEmail } from "@/lib/email/templates/company-weekly-job-digest";

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

function unsubscribeUrl(token: string) {
  return `${BASE_URL}/api/email/unsubscribe?token=${token}`;
}
function preferencesUrl() {
  return `${BASE_URL}/configuracion/notificaciones`;
}

// Mismo criterio que /api/cron/daily: ningún scheduler propio, la pega un
// cron externo una vez por semana.
export async function POST(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = await pbAdmin();
  const now = new Date();
  let sent = 0;
  let companyDigests = 0;

  // 1. Digest semanal de empresa: postulantes de los últimos 7 días
  // agrupados por negocio (mismo patrón de un solo query + expand que el
  // digest diario en /api/cron/daily). El gate por preferencia
  // (companyDigestFrequency === "weekly") lo aplica sendTransactionalEmail,
  // así que acá calculamos para TODA empresa con actividad y dejamos que el
  // gate filtre -- salvo que no tenga postulantes nuevos NI búsquedas
  // activas, ahí no hay nada que contar y lo salteamos antes.
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekApplications = await admin.collection("applications").getFullList({
    filter: admin.filter("created > {:since}", { since: weekAgo }),
    expand: "job_post.business",
    requestKey: null,
  });
  const countByBusiness = new Map<string, { business: Record<string, unknown>; count: number }>();
  for (const app of weekApplications) {
    const jobPost = app.expand?.job_post as { expand?: { business?: Record<string, unknown> } } | undefined;
    const business = jobPost?.expand?.business;
    if (!business) continue;
    const id = business.id as string;
    const entry = countByBusiness.get(id);
    if (entry) entry.count += 1;
    else countByBusiness.set(id, { business, count: 1 });
  }
  for (const { business, count } of countByBusiness.values()) {
    const user = await admin.collection("users").getOne(business.user as string).catch(() => null);
    if (!user?.email) continue;
    const prefs = await getOrCreatePreferences(user.id);
    const { totalItems: activeJobsCount } = await admin.collection("job_posts").getList(1, 1, {
      filter: admin.filter("business = {:id} && active = true && expires_at > {:now}", { id: business.id, now: now.toISOString() }),
      requestKey: null,
    });
    const result = await sendTransactionalEmail({
      type: "company_weekly_job_digest",
      to: user.email as string,
      userId: user.id,
      rendered: buildCompanyWeeklyJobDigestEmail({
        businessName: (business.business_name as string) || "",
        newApplicantsCount: count,
        activeJobsCount,
        panelUrl: `${BASE_URL}/empresa/panel`,
        preferencesUrl: preferencesUrl(),
        unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
      }),
      unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
    });
    if (result.sent) companyDigests += 1;
  }

  // 2. Digest semanal de visitas al perfil (postulantes).
  const candidates = await admin.collection("candidate_profiles").getFullList({
    filter: "profile_views_since_digest > 0",
    requestKey: null,
    fields: "id,user,name,profile_slug,profile_views_since_digest",
  });

  for (const candidate of candidates) {
    const user = await admin.collection("users").getOne(candidate.user as string).catch(() => null);
    if (user?.email && candidate.profile_slug) {
      const prefs = await getOrCreatePreferences(user.id);
      await sendTransactionalEmail({
        type: "candidate_weekly_profile_views",
        to: user.email as string,
        userId: user.id,
        rendered: buildCandidateWeeklyProfileViewsEmail({
          name: (candidate.name as string) || "",
          viewsCount: candidate.profile_views_since_digest as number,
          profileUrl: `${BASE_URL}/p/${candidate.profile_slug}`,
          preferencesUrl: preferencesUrl(),
          unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
        }),
        unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
      });
      sent += 1;
    }
    // Se resetea siempre, haya mandado el mail o no (ej. preferencia en
    // "never") -- si no, un candidato con el digest apagado acumularía
    // profile_views_since_digest para siempre sin que nada lo lea.
    await admin.collection("candidate_profiles").update(candidate.id, { profile_views_since_digest: 0 });
  }

  return NextResponse.json({ ok: true, summary: { profileViews: sent, companyDigests, total: candidates.length } });
}
