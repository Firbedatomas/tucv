import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { getOrCreatePreferences } from "@/lib/email/preferences";
import { sendTransactionalEmail } from "@/lib/email/send";
import { buildCandidateInvitationEmail } from "@/lib/email/templates/candidate-invitation";
import { logActivity } from "@/lib/activity";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";
const DAY = 24 * 60 * 60 * 1000;

// Límite diario de invitaciones por empresa según plan -- mismo criterio que las
// solicitudes de contacto (app/api/contact-requests): el plan pago tiene más
// cupo, lo que hace real el beneficio "más invitaciones por día".
function dailyLimitForPlan(plan: string | undefined): number {
  return plan === "pro" || plan === "multi_local" ? 50 : 10;
}

// Mismo patrón que app/api/business-invites: valida el token de sesión y
// devuelve el business_accounts DUEÑO. Un viewer no tiene fila propia -> tira.
async function resolveOwnerBusiness(token: string) {
  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(token, null);
  await client.collection("users").authRefresh();
  const userId = client.authStore.record?.id;
  if (!userId) throw new Error("no-user");
  return client.collection("business_accounts").getFirstListItem(`user="${userId}"`);
}

// POST: la empresa invita a un candidato del directorio a una de sus búsquedas.
// Crea la invitación (in-app para todos) y, si el candidato tiene cuenta con
// email, le manda un aviso. La postulación real recién se crea si acepta.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
  const jobPostId = typeof body.jobPostId === "string" ? body.jobPostId : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!candidateId || !jobPostId) {
    return NextResponse.json({ error: "Faltan datos de la invitación." }, { status: 400 });
  }

  let business;
  try {
    business = await resolveOwnerBusiness(token);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = await pbAdmin();
    const job = await admin.collection("job_posts").getOne(jobPostId).catch(() => null);
    if (!job || job.business !== business.id) {
      return NextResponse.json({ error: "Esa búsqueda no es tuya." }, { status: 403 });
    }
    const candidate = await admin.collection("candidate_profiles").getOne(candidateId).catch(() => null);
    if (!candidate) return NextResponse.json({ error: "Candidato inexistente." }, { status: 404 });
    // Solo se invita a quien eligió ser visible para empresas.
    if (!candidate.consent_zone_visible) {
      return NextResponse.json({ error: "Ese candidato no está visible para empresas." }, { status: 403 });
    }

    // Límite diario de invitaciones por empresa según el plan.
    const dailyLimit = dailyLimitForPlan(business.plan as string | undefined);
    const daySince = new Date(Date.now() - DAY).toISOString();
    const todayCount = await admin.collection("candidate_invitations").getList(1, 1, {
      filter: admin.filter("business = {:b} && created > {:since}", { b: business.id, since: daySince }),
    });
    if (todayCount.totalItems >= dailyLimit) {
      return NextResponse.json(
        { error: "Alcanzaste el límite de invitaciones por día de tu plan. Probá de nuevo mañana." },
        { status: 429 },
      );
    }

    let invitation;
    try {
      invitation = await admin.collection("candidate_invitations").create({
        business: business.id,
        candidate: candidateId,
        job_post: jobPostId,
        status: "enviada",
        message,
      });
    } catch {
      // Índice único (business, candidate, job_post): ya lo invitaste a esa búsqueda.
      return NextResponse.json(
        { error: "Ya invitaste a este candidato a esta búsqueda." },
        { status: 409 },
      );
    }

    // Evento interno (no sale en el feed público: invitar es sensible), sirve
    // para métricas de "empresas moviéndose".
    await logActivity(admin, {
      type: "company_invited_candidate",
      actorType: "company",
      zone: (business.city_zone as string) || "",
      jobId: jobPostId,
      candidateId,
      visibility: "internal",
      metadata: { jobTitle: (job.role as string) || (job.name as string) || "" },
    });

    // Email best-effort: solo si el candidato tiene cuenta con email. Los
    // perfiles anónimos igual ven la invitación in-app en su editor.
    let emailed = false;
    if (candidate.user) {
      const user = await admin.collection("users").getOne(candidate.user as string).catch(() => null);
      if (user?.email) {
        const prefs = await getOrCreatePreferences(user.id);
        const unsubscribeUrl = `${BASE_URL}/api/email/unsubscribe?token=${prefs.unsubscribeToken}`;
        const res = await sendTransactionalEmail({
          type: "candidate_invitation",
          to: user.email as string,
          userId: user.id,
          rendered: buildCandidateInvitationEmail({
            name: (candidate.name as string) || "",
            businessName: (business.business_name as string) || "Una empresa",
            jobTitle: (job.role as string) || (job.name as string) || "una búsqueda",
            message,
            invitationsUrl: `${BASE_URL}/postulante/editar`,
            preferencesUrl: `${BASE_URL}/configuracion/notificaciones`,
            unsubscribeUrl,
          }),
          unsubscribeUrl,
        });
        emailed = res.sent;
      }
    }

    return NextResponse.json({ ok: true, invitationId: invitation.id, emailed });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar la invitación." }, { status: 500 });
  }
}
