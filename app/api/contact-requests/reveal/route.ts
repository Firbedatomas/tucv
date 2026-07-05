import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveOwnerBusiness } from "@/lib/business-session";
import { logActivity } from "@/lib/activity";

// La empresa obtiene el WhatsApp de un candidato SOLO si éste habilitó contacto
// directo (consent_contact) O aceptó una solicitud de contacto de esta empresa.
// El WhatsApp ya NO viaja en el listado (ver /api/empresa/candidates): este es
// el único camino para obtenerlo, siempre server-side y con auditoría.
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
      .getOne(candidateId, { fields: "id,consent_contact,whatsapp", requestKey: null })
      .catch(() => null);
    if (!candidate) return NextResponse.json({ error: "Candidato inexistente." }, { status: 404 });

    // Autorizado si tiene contacto directo, o si aceptó una solicitud de ESTA empresa.
    let allowed = Boolean(candidate.consent_contact);
    if (!allowed) {
      const accepted = await admin
        .collection("contact_requests")
        .getFirstListItem(
          admin.filter("business = {:b} && candidate = {:c} && status = 'accepted'", {
            b: business.id,
            c: candidateId,
          }),
          { requestKey: null },
        )
        .catch(() => null);
      allowed = Boolean(accepted);
    }
    if (!allowed) {
      return NextResponse.json({ error: "Este candidato no habilitó el contacto." }, { status: 403 });
    }

    await logActivity(admin, {
      type: "contact_revealed",
      actorType: "company",
      candidateId,
      visibility: "internal",
      metadata: { businessId: business.id },
    });
    return NextResponse.json({ ok: true, whatsapp: (candidate.whatsapp as string) || "" });
  } catch {
    return NextResponse.json({ error: "Error." }, { status: 500 });
  }
}
