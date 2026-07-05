import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { getRefToken } from "@/lib/attribution";
import { logActivity, type ActivityType } from "@/lib/activity";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Cierre del embudo de atribución: cuando alguien que llegó por un link
// compartido CONVIERTE (se registra o se postula), leemos la cookie `tucv_ref`,
// resolvemos qué share_link (y por lo tanto qué canal) la trajo, y emitimos el
// evento *_from_share con ese canal. Si no hay cookie o el token no existe, es
// un no-op silencioso. Las VISTAS desde share ya las cubre `share_clicked` en
// /s/[token], así que acá solo van las conversiones que importan.
const EVENT_MAP: Record<string, ActivityType> = {
  candidate_registered: "candidate_registered_from_share",
  application_sent: "application_sent_from_share",
  company_registered: "company_registered_from_share",
};

const HOUR = 60 * 60 * 1000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const type = EVENT_MAP[body.event];
  if (!type) return NextResponse.json({ ok: false }, { status: 400 });

  const token = getRefToken(req);
  if (!token) return NextResponse.json({ ok: true, attributed: false });

  // Freno de abuso: no dejamos que una IP inunde de conversiones falsas.
  if (!checkRateLimit({ key: `attrib:${getClientIp(req)}`, limit: 30, windowMs: HOUR }).allowed) {
    return NextResponse.json({ ok: true, attributed: false });
  }

  try {
    const admin = await pbAdmin();
    const link = await admin
      .collection("share_links")
      .getFirstListItem(`token="${token}"`, { fields: "channel,entity_type,entity_id", requestKey: null })
      .catch(() => null);
    if (!link) return NextResponse.json({ ok: true, attributed: false });

    await logActivity(admin, {
      type,
      actorType: body.event === "company_registered" ? "company" : "candidate",
      visibility: "internal",
      metadata: {
        channel: link.channel,
        source_entity_type: link.entity_type,
        source_entity_id: link.entity_id,
      },
    });
    return NextResponse.json({ ok: true, attributed: true, channel: link.channel });
  } catch {
    return NextResponse.json({ ok: true, attributed: false });
  }
}
