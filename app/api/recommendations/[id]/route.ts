import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveUserIdFromToken } from "@/lib/candidate-session";
import { logActivity, type ActivityType } from "@/lib/activity";

const ACTION_STATUS: Record<string, { status: string; event: ActivityType }> = {
  approve: { status: "approved", event: "recommendation_approved" },
  hide: { status: "hidden", event: "recommendation_hidden" },
  reject: { status: "rejected", event: "recommendation_rejected" },
};

// El candidato dueño aprueba / oculta / rechaza una recomendación recibida.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const spec = ACTION_STATUS[body.action];
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!spec) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });

  const userId = await resolveUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const admin = await pbAdmin();
    const rec = await admin.collection("recommendations").getOne(id).catch(() => null);
    if (!rec) return NextResponse.json({ error: "No existe." }, { status: 404 });
    const candidate = await admin.collection("candidate_profiles").getOne(rec.candidate as string).catch(() => null);
    if (!candidate || candidate.user !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
    await admin.collection("recommendations").update(id, { status: spec.status });
    await logActivity(admin, {
      type: spec.event,
      actorType: "candidate",
      candidateId: candidate.id,
      visibility: "internal",
    });
    return NextResponse.json({ ok: true, status: spec.status });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
}
