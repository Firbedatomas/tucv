import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveOwnerBusiness } from "@/lib/business-session";
import { getOrCreatePreferences } from "@/lib/email/preferences";
import { sendTransactionalEmail } from "@/lib/email/send";
import { buildContactRequestEmail } from "@/lib/email/templates/contact-request";
import { logActivity } from "@/lib/activity";
import { checkRateLimit } from "@/lib/rate-limit";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Límite diario de solicitudes por empresa según plan. El plan gratis es más
// acotado para proteger la confianza del candidato (evitar spam masivo).
function dailyLimitForPlan(plan: string | undefined): number {
  return plan === "pro" || plan === "multi_local" ? 50 : 10;
}
const MAX_PER_CANDIDATE_30D = 3;

// La empresa solicita contacto con un candidato (fallback a WhatsApp directo).
// Queda pending; el candidato acepta/rechaza. Notifica por email si el
// candidato tiene cuenta; siempre lo ve in-app en su editor.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
  const jobPostId = typeof body.jobPostId === "string" ? body.jobPostId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!candidateId) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });

  let business;
  try {
    business = await resolveOwnerBusiness(token);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit({ key: `contact_req:${business.id}`, limit: 30, windowMs: HOUR });
  if (!rl.allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Probá más tarde." }, { status: 429 });

  try {
    const admin = await pbAdmin();
    const candidate = await admin.collection("candidate_profiles").getOne(candidateId).catch(() => null);
    if (!candidate) return NextResponse.json({ error: "Candidato inexistente." }, { status: 404 });

    // Bloqueo: si el candidato bloqueó a esta empresa, no puede contactarlo.
    const blocked = await admin
      .collection("blocks")
      .getFirstListItem(admin.filter("candidate = {:c} && business = {:b}", { c: candidateId, b: business.id }))
      .catch(() => null);
    if (blocked) {
      return NextResponse.json(
        { error: "Este candidato no está recibiendo solicitudes de tu empresa." },
        { status: 403 },
      );
    }

    // Si el candidato rechazó una solicitud de esta empresa en los últimos 30
    // días, no se puede volver a insistir hasta que pase ese plazo.
    const rejectedSince = new Date(Date.now() - 30 * DAY).toISOString();
    const recentlyRejected = await admin.collection("contact_requests").getList(1, 1, {
      filter: admin.filter(
        "business = {:b} && candidate = {:c} && status = 'rejected' && updated > {:since}",
        { b: business.id, c: candidateId, since: rejectedSince },
      ),
    });
    if (recentlyRejected.totalItems > 0) {
      return NextResponse.json(
        { error: "Este candidato rechazó una solicitud reciente. Podés volver a intentar más adelante." },
        { status: 403 },
      );
    }

    // Máximo de solicitudes al MISMO candidato en 30 días (evita hostigamiento).
    const perCandidateSince = new Date(Date.now() - 30 * DAY).toISOString();
    const toCandidate = await admin.collection("contact_requests").getList(1, 1, {
      filter: admin.filter(
        "business = {:b} && candidate = {:c} && created > {:since}",
        { b: business.id, c: candidateId, since: perCandidateSince },
      ),
    });
    if (toCandidate.totalItems >= MAX_PER_CANDIDATE_30D) {
      return NextResponse.json(
        { error: "Ya enviaste varias solicitudes a este candidato este mes. Esperá un poco antes de insistir." },
        { status: 429 },
      );
    }

    // Límite diario de solicitudes por empresa según el plan.
    const dailyLimit = dailyLimitForPlan(business.plan as string | undefined);
    const daySince = new Date(Date.now() - DAY).toISOString();
    const todayCount = await admin.collection("contact_requests").getList(1, 1, {
      filter: admin.filter("business = {:b} && created > {:since}", { b: business.id, since: daySince }),
    });
    if (todayCount.totalItems >= dailyLimit) {
      return NextResponse.json(
        { error: "Alcanzaste el límite de solicitudes por día de tu plan. Probá de nuevo mañana." },
        { status: 429 },
      );
    }

    let job = null;
    if (jobPostId) {
      job = await admin.collection("job_posts").getOne(jobPostId).catch(() => null);
      if (!job || job.business !== business.id) {
        return NextResponse.json({ error: "Esa búsqueda no es tuya." }, { status: 403 });
      }
    }

    // Evitá duplicar una solicitud pendiente del mismo negocio al mismo candidato.
    const existing = await admin
      .collection("contact_requests")
      .getFirstListItem(
        admin.filter("business = {:b} && candidate = {:c} && status = 'pending'", { b: business.id, c: candidateId }),
      )
      .catch(() => null);
    if (existing) return NextResponse.json({ ok: true, alreadyPending: true });

    await admin.collection("contact_requests").create({
      business: business.id,
      candidate: candidateId,
      job_post: jobPostId || null,
      reason,
      status: "pending",
    });
    await logActivity(admin, {
      type: "contact_requested",
      actorType: "company",
      candidateId,
      visibility: "internal",
    });

    // Aviso al candidato (best-effort, solo si tiene cuenta con email).
    if (candidate.user) {
      const user = await admin.collection("users").getOne(candidate.user as string).catch(() => null);
      if (user?.email) {
        const prefs = await getOrCreatePreferences(user.id);
        const unsubscribeUrl = `${BASE_URL}/api/email/unsubscribe?token=${prefs.unsubscribeToken}`;
        await sendTransactionalEmail({
          type: "contact_request",
          to: user.email as string,
          userId: user.id,
          rendered: buildContactRequestEmail({
            name: (candidate.name as string) || "",
            businessName: (business.business_name as string) || "Una empresa",
            jobTitle: job ? (job.role as string) || (job.name as string) || "" : "",
            reason,
            inboxUrl: `${BASE_URL}/postulante/editar`,
            preferencesUrl: `${BASE_URL}/configuracion/notificaciones`,
            unsubscribeUrl,
          }),
          unsubscribeUrl,
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar la solicitud." }, { status: 500 });
  }
}
