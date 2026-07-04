import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { getOrCreatePreferences } from "@/lib/email/preferences";
import { sendTransactionalEmail } from "@/lib/email/send";
import { buildCandidateWeeklyProfileViewsEmail } from "@/lib/email/templates/candidate-weekly-profile-views";

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

function unsubscribeUrl(token: string) {
  return `${BASE_URL}/api/email/unsubscribe?token=${token}`;
}
function preferencesUrl() {
  return `${BASE_URL}/configuracion/notificaciones`;
}

// Mismo criterio que /api/cron/daily: ningún scheduler propio, la pega un
// cron externo una vez por semana.
export async function POST(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = await pbAdmin();
  let sent = 0;

  const candidates = await admin.collection("candidate_profiles").getFullList({
    filter: "profile_views_since_digest > 0",
    requestKey: null,
    fields: "id,user,name,profile_slug,profile_views_since_digest",
  });

  for (const candidate of candidates) {
    const user = await admin.collection("users").getOne(candidate.user as string).catch(() => null);
    if (user?.email && candidate.profile_slug) {
      const prefs = await getOrCreatePreferences(user.id);
      await sendTransactionalEmail({
        type: "candidate_weekly_profile_views",
        to: user.email as string,
        userId: user.id,
        rendered: buildCandidateWeeklyProfileViewsEmail({
          name: (candidate.name as string) || "",
          viewsCount: candidate.profile_views_since_digest as number,
          profileUrl: `${BASE_URL}/p/${candidate.profile_slug}`,
          preferencesUrl: preferencesUrl(),
          unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
        }),
        unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
      });
      sent += 1;
    }
    // Se resetea siempre, haya mandado el mail o no (ej. preferencia en
    // "never") -- si no, un candidato con el digest apagado acumularía
    // profile_views_since_digest para siempre sin que nada lo lea.
    await admin.collection("candidate_profiles").update(candidate.id, { profile_views_since_digest: 0 });
  }

  return NextResponse.json({ ok: true, summary: { sent, total: candidates.length } });
}
