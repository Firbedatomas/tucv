import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { getOrCreatePreferences } from "@/lib/email/preferences";
import { sendTransactionalEmail } from "@/lib/email/send";
import { buildJobExpiringEmail } from "@/lib/email/templates/job-expiring";
import { buildJobDeactivatedSummaryEmail } from "@/lib/email/templates/job-deactivated-summary";
import { buildCompanyDailyJobDigestEmail } from "@/lib/email/templates/company-daily-job-digest";
import { buildCandidateMatchDigestEmail } from "@/lib/email/templates/candidate-match-digest";
import { buildProfileStartedEmail } from "@/lib/email/templates/profile-started";

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

function unsubscribeUrl(token: string) {
  return `${BASE_URL}/api/email/unsubscribe?token=${token}`;
}
function preferencesUrl() {
  return `${BASE_URL}/configuracion/notificaciones`;
}

// No hay ningún scheduler hoy en este repo (sin Vercel Cron, sin worker) --
// esta ruta la tiene que pegar un cron externo (system crontab + curl en el
// VPS, ver README de deploy) una vez por día, con el secreto como Bearer
// token. Devuelve un resumen en vez de nada para poder ver en el log del
// cron qué mandó sin tener que ir a mirar email_events a mano.
export async function POST(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = await pbAdmin();
  const now = new Date();
  const summary = { jobExpiring: 0, jobDeactivated: 0, companyDigests: 0, candidateDigests: 0, profileStarted: 0 };

  // 1. Búsquedas por vencer (dentro de los próximos 2 días, todavía activas
  // y no avisadas ya para este ciclo -- ver expiring_notified/pb_hooks).
  const soon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const expiringSoon = await admin.collection("job_posts").getFullList({
    filter: admin.filter("active = true && expiring_notified != true && expires_at > {:now} && expires_at < {:soon}", {
      now: now.toISOString(),
      soon,
    }),
    expand: "business",
    requestKey: null,
  });
  for (const job of expiringSoon) {
    const business = job.expand?.business as Record<string, unknown> | undefined;
    if (!business) continue;
    const user = await admin.collection("users").getOne(business.user as string).catch(() => null);
    if (user?.email) {
      const prefs = await getOrCreatePreferences(user.id);
      const expiresInDays = Math.max(1, Math.ceil((new Date(job.expires_at as string).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      await sendTransactionalEmail({
        type: "job_expiring",
        to: user.email as string,
        userId: user.id,
        rendered: buildJobExpiringEmail({
          businessName: (business.business_name as string) || "",
          jobTitle: (job.role as string) || (job.name as string) || "tu búsqueda",
          expiresInDays,
          renewUrl: `${BASE_URL}/empresa/busquedas/${job.id}`,
          preferencesUrl: preferencesUrl(),
          unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
        }),
        unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
      });
    }
    await admin.collection("job_posts").update(job.id, { expiring_notified: true });
    summary.jobExpiring += 1;
  }

  // 2. Búsquedas que ya vencieron (recién cruzaron la fecha, todavía activas
  // en la base -- ver nota en lib/job-post-status.ts: expires_at pasado no
  // flipea `active` solo, es un estado computado al leer) y no avisadas.
  const justExpired = await admin.collection("job_posts").getFullList({
    filter: admin.filter("active = true && expired_notified != true && expires_at < {:now}", { now: now.toISOString() }),
    expand: "business",
    requestKey: null,
  });
  for (const job of justExpired) {
    const business = job.expand?.business as Record<string, unknown> | undefined;
    if (business) {
      const user = await admin.collection("users").getOne(business.user as string).catch(() => null);
      if (user?.email) {
        const prefs = await getOrCreatePreferences(user.id);
        const { totalItems } = await admin
          .collection("applications")
          .getList(1, 1, { filter: admin.filter("job_post = {:id}", { id: job.id }), requestKey: null });
        await sendTransactionalEmail({
          type: "job_deactivated_summary",
          to: user.email as string,
          userId: user.id,
          rendered: buildJobDeactivatedSummaryEmail({
            businessName: (business.business_name as string) || "",
            jobTitle: (job.role as string) || (job.name as string) || "tu búsqueda",
            totalApplicants: totalItems,
            renewUrl: `${BASE_URL}/empresa/busquedas/nueva`,
            preferencesUrl: preferencesUrl(),
            unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
          }),
          unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
        });
      }
    }
    await admin.collection("job_posts").update(job.id, { expired_notified: true });
    summary.jobDeactivated += 1;
  }

  // 3. Impacto diario: postulaciones nuevas (últimas 24hs) agrupadas por
  // negocio -- un solo query con expand en vez de recorrer negocio por
  // negocio, para no multiplicar consultas por cada empresa con búsquedas
  // activas.
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const recentApplications = await admin.collection("applications").getFullList({
    filter: admin.filter("created > {:since}", { since: yesterday }),
    expand: "job_post.business",
    requestKey: null,
  });
  const countByBusiness = new Map<string, { business: Record<string, unknown>; count: number }>();
  for (const app of recentApplications) {
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
    await sendTransactionalEmail({
      type: "company_daily_job_digest",
      to: user.email as string,
      userId: user.id,
      rendered: buildCompanyDailyJobDigestEmail({
        businessName: (business.business_name as string) || "",
        newApplicantsCount: count,
        jobsSummary: `Recibiste ${count} ${count === 1 ? "nuevo postulante" : "nuevos postulantes"} en tus búsquedas activas en las últimas 24 horas.`,
        panelUrl: `${BASE_URL}/empresa/panel`,
        preferencesUrl: preferencesUrl(),
        unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
      }),
      unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
    });
    summary.companyDigests += 1;
  }

  // 4. "Empezaste pero no completaste tu perfil": cuentas de Google creadas
  // entre 1 y 14 días atrás, sin candidate_profiles NI business_accounts
  // todavía. Ventana acotada (recién creadas se ignoran para no molestar de
  // entrada; más de 14 días se dejan de nudgear) + chequeo contra
  // email_events para no repetir el aviso día tras día. Es un N+1 por
  // usuario reciente sin perfil -- aceptable al volumen de altas diarias de
  // un mercado local, no a escala masiva.
  const windowStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const recentUsers = await admin.collection("users").getFullList({
    filter: admin.filter("created > {:start} && created < {:end}", { start: windowStart, end: windowEnd }),
    requestKey: null,
  });
  for (const user of recentUsers) {
    const hasCandidate = await admin
      .collection("candidate_profiles")
      .getFirstListItem(admin.filter("user = {:id}", { id: user.id }))
      .then(() => true)
      .catch(() => false);
    if (hasCandidate) continue;
    const hasBusiness = await admin
      .collection("business_accounts")
      .getFirstListItem(admin.filter("user = {:id}", { id: user.id }))
      .then(() => true)
      .catch(() => false);
    if (hasBusiness) continue;
    const alreadyNotified = await admin
      .collection("email_events")
      .getFirstListItem(admin.filter('user = {:id} && type = "profile_started"', { id: user.id }))
      .then(() => true)
      .catch(() => false);
    if (alreadyNotified) continue;
    if (!user.email) continue;

    const prefs = await getOrCreatePreferences(user.id);
    await sendTransactionalEmail({
      type: "profile_started",
      to: user.email as string,
      userId: user.id,
      rendered: buildProfileStartedEmail({
        createProfileUrl: `${BASE_URL}/postulante/nuevo`,
        preferencesUrl: preferencesUrl(),
        unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
      }),
      unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
    });
    summary.profileStarted += 1;
  }

  // 5. Alerta Pro de candidatos compatibles nuevos. Por cada negocio Pro/Equipo
  // con búsquedas activas, contamos candidatos VISIBLES cuyo rubro coincide con
  // el de alguna de sus búsquedas y que tuvieron novedad (updated) desde el
  // último aviso; si hay, mandamos el digest. Primera corrida (sin
  // last_candidate_alert_at) NO alerta: solo fija el punto de partida para no
  // "gritar" con todo el backlog. El opt-out lo maneja el GATE del tipo
  // candidate_match_digest (misma preferencia que el digest diario). N+1 sobre
  // negocios Pro -- son pocos, aceptable al volumen de un mercado local.
  const proBusinesses = await admin.collection("business_accounts").getFullList({
    filter: admin.filter('plan = "pro" || plan = "multi_local"'),
    requestKey: null,
  });
  for (const business of proBusinesses) {
    const activeJobs = await admin.collection("job_posts").getFullList({
      filter: admin.filter("business = {:b} && active = true && expires_at > {:now}", {
        b: business.id,
        now: now.toISOString(),
      }),
      fields: "category",
      requestKey: null,
    });
    const cats = [...new Set(activeJobs.map((j) => j.category as string).filter(Boolean))];
    if (cats.length === 0) continue; // sin búsquedas activas: nada que alertar

    const lastAlertRaw = business.last_candidate_alert_at as string | undefined;
    if (lastAlertRaw) {
      // categories es multi-select: "coincide" si contiene alguno de los rubros
      // de las búsquedas activas. Params nombrados para no interpolar valores.
      const catFilters = cats.map((_, i) => `categories ~ {:c${i}}`).join(" || ");
      const params: Record<string, string> = { since: lastAlertRaw };
      cats.forEach((c, i) => {
        params[`c${i}`] = c;
      });
      const { totalItems } = await admin.collection("candidate_profiles").getList(1, 1, {
        filter: admin.filter(`consent_zone_visible = true && updated > {:since} && (${catFilters})`, params),
        requestKey: null,
      });
      if (totalItems > 0) {
        const user = await admin.collection("users").getOne(business.user as string).catch(() => null);
        if (user?.email) {
          const prefs = await getOrCreatePreferences(user.id);
          await sendTransactionalEmail({
            type: "candidate_match_digest",
            to: user.email as string,
            userId: user.id,
            rendered: buildCandidateMatchDigestEmail({
              businessName: (business.business_name as string) || "",
              count: totalItems,
              candidatesUrl: `${BASE_URL}/empresa/candidatos`,
              preferencesUrl: preferencesUrl(),
              unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
            }),
            unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
          });
          summary.candidateDigests += 1;
        }
      }
    }
    // Avanzamos el punto de corte siempre (haya o no alerta) para que la próxima
    // corrida mire solo lo nuevo desde ahora.
    await admin.collection("business_accounts").update(business.id, {
      last_candidate_alert_at: now.toISOString(),
    });
  }

  return NextResponse.json({ ok: true, summary });
}
