import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveOwnerBusiness } from "@/lib/business-session";
import { logActivity } from "@/lib/activity";

// La empresa revela el WhatsApp de un candidato que aceptó contacto directo
// (consent_contact). El dato ya está en la vista de la empresa; esto solo
// registra el acceso (contact_revealed) para auditoría, como pide la regla.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!candidateId) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });

  let business;
  try {
    business = await resolveOwnerBusiness(token);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = await pbAdmin();
    const candidate = await admin
      .collection("candidate_profiles")
      .getOne(candidateId, { fields: "id,consent_contact", requestKey: null })
      .catch(() => null);
    if (!candidate || !candidate.consent_contact) {
      return NextResponse.json({ error: "Este candidato no habilitó contacto directo." }, { status: 403 });
    }
    await logActivity(admin, {
      type: "contact_revealed",
      actorType: "company",
      candidateId,
      visibility: "internal",
      metadata: { businessId: business.id },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error." }, { status: 500 });
  }
}
