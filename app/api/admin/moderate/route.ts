import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";

// Moderación operativa sobre la cola de reportes (app/admin/reportes).
// Todo pasa por pbAdmin() (sesión de superusuario): las colecciones de
// reportes tienen updateRule: null y suspender un candidato/negocio dispara
// los hooks de sincronización del espejo público (ver pb_hooks/main.pb.js).
//
// Cada acción setea el `status` del reporte y, cuando corresponde, "esconde"
// o bloquea el target apuntado:
//   - profile  -> candidate (candidate_profiles)   .suspended
//   - business -> job_post (job_posts) .active / business (business_accounts) .suspended
//   - content  -> referencia/recomendación suelta: no hay un candidato/negocio
//                 directo para suspender, así que solo se mueve el status.

const REPORT_COLLECTION = {
  profile: "profile_reports",
  business: "business_reports",
  content: "content_reports",
} as const;

type ReportType = keyof typeof REPORT_COLLECTION;

// action -> status resultante del reporte.
const ACTION_STATUS: Record<string, string> = {
  mark_reviewing: "reviewing",
  resolve_no_action: "resolved_no_action",
  hide_target: "hidden",
  warn_user: "user_warned",
  block_user: "user_blocked",
  mark_reviewed: "reviewed",
  dismiss: "dismissed",
};

export async function POST(req: Request) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  const reportType = body.reportType as ReportType | undefined;
  const reportId = body.reportId as string | undefined;
  const action = body.action as string | undefined;

  if (!reportType || !(reportType in REPORT_COLLECTION)) {
    return NextResponse.json({ error: "reportType inválido" }, { status: 400 });
  }
  if (!reportId) {
    return NextResponse.json({ error: "falta reportId" }, { status: 400 });
  }
  if (!action || !(action in ACTION_STATUS)) {
    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  }

  const collection = REPORT_COLLECTION[reportType];
  const admin = await pbAdmin();

  const report = await admin.collection(collection).getOne(reportId).catch(() => null);
  if (!report) return NextResponse.json({ error: "reporte no encontrado" }, { status: 404 });

  // Acciones que afectan al target (esconder / bloquear).
  if (action === "hide_target" || action === "block_user") {
    try {
      if (reportType === "profile") {
        // Suspender el perfil lo saca del espejo público (mismo efecto que
        // /api/admin/candidates). Tanto esconder como bloquear lo suspenden.
        const candidateId = report.candidate as string;
        if (candidateId) {
          await admin.collection("candidate_profiles").update(candidateId, { suspended: true });
        }
      } else if (reportType === "business") {
        const jobPostId = report.job_post as string;
        if (action === "hide_target") {
          // Esconder la búsqueda puntual reportada, sin tumbar todo el negocio.
          if (jobPostId) {
            await admin.collection("job_posts").update(jobPostId, { active: false });
          }
        } else {
          // block_user: suspender el negocio dueño de la búsqueda.
          const jobPost = jobPostId
            ? await admin.collection("job_posts").getOne(jobPostId).catch(() => null)
            : null;
          const businessId = jobPost?.business as string | undefined;
          if (businessId) {
            await admin.collection("business_accounts").update(businessId, { suspended: true });
          }
        }
      }
      // content: no hay un candidato/negocio directo para suspender ("si aplica").
    } catch {
      return NextResponse.json({ error: "no se pudo actualizar el target" }, { status: 500 });
    }
  }

  const updated = await admin
    .collection(collection)
    .update(reportId, { status: ACTION_STATUS[action] })
    .catch(() => null);
  if (!updated) return NextResponse.json({ error: "no se pudo actualizar el reporte" }, { status: 500 });

  return NextResponse.json({ ok: true, status: ACTION_STATUS[action] });
}
