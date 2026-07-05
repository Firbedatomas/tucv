import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveUserIdFromToken } from "@/lib/candidate-session";

export const dynamic = "force-dynamic";

// Métricas propias del postulante para /postulante/mi-actividad. Solo datos
// reales del perfil dueño del token -- nada agregado de otros. Resiliente a
// colecciones vacías (share_links puede no tener nada todavía).

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  x: "X",
  instagram: "Instagram",
  copy: "Copiar link",
  qr: "QR",
  poster: "Afiche",
  widget: "Widget",
  rss: "RSS",
  api: "API",
};

function weekAgoISO(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

type ShareLink = { channel: string; clicks: number; created: string };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body?.token ?? null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = await resolveUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const admin = await pbAdmin();
    const profile = await admin
      .collection("candidate_profiles")
      .getFirstListItem(`user="${userId}"`, {
        fields: "id,name,profile_views_total,profile_views_since_digest",
        requestKey: null,
      })
      .catch(() => null);

    if (!profile) return NextResponse.json({ hasProfile: false });

    const id = profile.id as string;
    const weekISO = weekAgoISO();

    const [shares, savedTotal, savedWeek, contactTotal, contactWeek, invTotal, invWeek] =
      await Promise.all([
        admin
          .collection("share_links")
          .getFullList<ShareLink>({
            filter: admin.filter('entity_type = "profile" && entity_id = {:id}', { id }),
            fields: "channel,clicks,created",
            requestKey: null,
          })
          .catch(() => [] as ShareLink[]),
        admin.collection("saved_candidates").getList(1, 1, {
          filter: admin.filter("candidate = {:id}", { id }),
          requestKey: null,
        }).then((r) => r.totalItems).catch(() => 0),
        admin.collection("saved_candidates").getList(1, 1, {
          filter: admin.filter("candidate = {:id} && created >= {:w}", { id, w: weekISO }),
          requestKey: null,
        }).then((r) => r.totalItems).catch(() => 0),
        admin.collection("contact_requests").getList(1, 1, {
          filter: admin.filter("candidate = {:id}", { id }),
          requestKey: null,
        }).then((r) => r.totalItems).catch(() => 0),
        admin.collection("contact_requests").getList(1, 1, {
          filter: admin.filter("candidate = {:id} && created >= {:w}", { id, w: weekISO }),
          requestKey: null,
        }).then((r) => r.totalItems).catch(() => 0),
        admin.collection("candidate_invitations").getList(1, 1, {
          filter: admin.filter("candidate = {:id}", { id }),
          requestKey: null,
        }).then((r) => r.totalItems).catch(() => 0),
        admin.collection("candidate_invitations").getList(1, 1, {
          filter: admin.filter("candidate = {:id} && created >= {:w}", { id, w: weekISO }),
          requestKey: null,
        }).then((r) => r.totalItems).catch(() => 0),
      ]);

    let sharesWeek = 0;
    let clicksTotal = 0;
    const byChannel: Record<string, number> = {};
    for (const s of shares) {
      if (s.created >= weekISO) sharesWeek += 1;
      clicksTotal += s.clicks ?? 0;
      byChannel[s.channel] = (byChannel[s.channel] ?? 0) + 1;
    }
    const shareChannels = Object.entries(byChannel)
      .map(([ch, value]) => ({ label: CHANNEL_LABELS[ch] ?? ch, value }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      hasProfile: true,
      name: (profile.name as string) || "",
      views: {
        total: (profile.profile_views_total as number) ?? 0,
        recent: (profile.profile_views_since_digest as number) ?? 0,
      },
      shares: {
        total: shares.length,
        thisWeek: sharesWeek,
        clicks: clicksTotal,
        byChannel: shareChannels,
      },
      savedByCompanies: { total: savedTotal, thisWeek: savedWeek },
      contactRequests: { total: contactTotal, thisWeek: contactWeek },
      invitations: { total: invTotal, thisWeek: invWeek },
    });
  } catch {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
