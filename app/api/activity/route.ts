import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { logActivity, type ActivityType } from "@/lib/activity";
import { coarseLocality } from "@/lib/anonymize";

export const dynamic = "force-dynamic";

// Emisión de eventos disparados desde flujos de cliente (registrarse, completar
// perfil, hacerlo público, crear búsqueda, postularse). El cliente solo manda
// el TIPO y un id; el server deriva zona/rubro del record real, así el feed no
// se puede envenenar con datos falsos. La zona se guarda ya anonimizada.
const ALLOWED: Record<string, { actor: "candidate" | "company"; source: "candidate" | "job"; visibility: "public" | "internal" }> = {
  candidate_registered: { actor: "candidate", source: "candidate", visibility: "public" },
  profile_completed: { actor: "candidate", source: "candidate", visibility: "public" },
  public_enabled: { actor: "candidate", source: "candidate", visibility: "public" },
  application_sent: { actor: "candidate", source: "candidate", visibility: "public" },
  job_created: { actor: "company", source: "job", visibility: "public" },
  // Interacciones de ayuda/viralidad sobre un perfil. profile_shared va al
  // feed público; las descargas y el pedido de compartir son métricas internas.
  profile_shared: { actor: "candidate", source: "candidate", visibility: "public" },
  help_request_shared: { actor: "candidate", source: "candidate", visibility: "internal" },
  profile_qr_downloaded: { actor: "candidate", source: "candidate", visibility: "internal" },
  profile_poster_downloaded: { actor: "candidate", source: "candidate", visibility: "internal" },
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const type = typeof body.type === "string" ? body.type : "";
  const spec = ALLOWED[type];
  if (!spec) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const admin = await pbAdmin();
    let zone = "";
    let category = "";
    if (spec.source === "candidate" && body.candidateId) {
      const c = await admin
        .collection("candidate_profiles")
        .getOne(String(body.candidateId), { fields: "city_zone,categories", requestKey: null })
        .catch(() => null);
      if (c) {
        zone = coarseLocality((c.city_zone as string) || "", false);
        category = ((c.categories as string[]) ?? [])[0] || "";
      }
    } else if (spec.source === "job" && body.jobId) {
      const j = await admin
        .collection("job_posts")
        .getOne(String(body.jobId), { fields: "address_zone,category", requestKey: null })
        .catch(() => null);
      if (j) {
        zone = coarseLocality((j.address_zone as string) || "", true);
        category = (j.category as string) || "";
      }
    }
    await logActivity(admin, {
      type: type as ActivityType,
      actorType: spec.actor,
      zone,
      visibility: spec.visibility,
      metadata: { category },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
