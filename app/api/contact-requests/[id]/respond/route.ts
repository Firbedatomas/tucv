import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveUserIdFromToken } from "@/lib/candidate-session";
import { logActivity } from "@/lib/activity";

// El candidato acepta o rechaza una solicitud de contacto. Al aceptar, su
// WhatsApp queda disponible para esa empresa (que lo lee de su vista de
// candidatos según el estado accepted).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const action = body.action;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const userId = await resolveUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const admin = await pbAdmin();
    const cr = await admin.collection("contact_requests").getOne(id).catch(() => null);
    if (!cr) return NextResponse.json({ error: "No existe." }, { status: 404 });
    const candidate = await admin.collection("candidate_profiles").getOne(cr.candidate as string).catch(() => null);
    if (!candidate || candidate.user !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
    if (cr.status !== "pending") return NextResponse.json({ ok: true, status: cr.status });

    const status = action === "accept" ? "accepted" : "rejected";
    await admin.collection("contact_requests").update(id, { status });
    await logActivity(admin, {
      type: action === "accept" ? "contact_accepted" : "contact_rejected",
      actorType: "candidate",
      candidateId: candidate.id,
      visibility: "internal",
    });
    return NextResponse.json({ ok: true, status });
  } catch {
    return NextResponse.json({ error: "No se pudo procesar." }, { status: 500 });
  }
}
