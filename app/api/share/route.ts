import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { logActivity } from "@/lib/activity";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { ShareChannel, ShareEntityType } from "@/lib/attribution";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

const VALID_ENTITIES = new Set<ShareEntityType>(["profile", "job"]);
const VALID_CHANNELS = new Set<ShareChannel>([
  "whatsapp",
  "x",
  "instagram",
  "copy",
  "qr",
  "poster",
  "widget",
  "rss",
  "api",
]);

// Crea un share_link y devuelve su URL corta (/s/<token>) para que el que
// comparte publique ESE link en vez del crudo -- así todo click queda atribuido
// al canal. Sin login: compartir un contenido público no requiere sesión. El
// rate-limit por IP es un freno de abuso (evitar que se inflen tokens en masa),
// no un contador crítico.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `share:${ip}`, limit: 40, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "demasiados intentos, probá de nuevo en un rato" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const entityType = body?.entityType as ShareEntityType;
  const entityId = typeof body?.entityId === "string" ? body.entityId.trim() : "";
  const channel = body?.channel as ShareChannel;
  const sharedByUser = typeof body?.sharedByUser === "string" ? body.sharedByUser.trim() : "";

  if (!VALID_ENTITIES.has(entityType) || !entityId || !VALID_CHANNELS.has(channel)) {
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }

  // Token opaco: UUID sin guiones (32 hex). No revela id ni orden de creación.
  const token = crypto.randomUUID().replace(/-/g, "");

  try {
    const admin = await pbAdmin();
    await admin.collection("share_links").create({
      entity_type: entityType,
      entity_id: entityId,
      shared_by_user: sharedByUser,
      channel,
      token,
      clicks: 0,
    });

    // Métrica interna: cuántos links se generan por canal. El evento público del
    // feed sigue siendo el share/click "real", no la creación del link.
    await logActivity(admin, {
      type: "share_created",
      actorType: entityType === "job" ? "company" : "candidate",
      visibility: "internal",
      metadata: { channel, entity_type: entityType },
    });

    return NextResponse.json({ token, url: `${BASE}/s/${token}` });
  } catch {
    return NextResponse.json({ error: "no pudimos crear el link" }, { status: 500 });
  }
}
