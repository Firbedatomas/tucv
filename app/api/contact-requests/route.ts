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
