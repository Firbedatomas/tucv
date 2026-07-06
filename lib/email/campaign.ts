import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { getOrCreatePreferences } from "@/lib/email/preferences";
import { isSuppressed } from "@/lib/email/suppression";
import { enqueueEmail } from "@/lib/email/queue";
import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";
// Tope por corrida para no timeoutear el request ni encolar de más de un saque.
// El ENVÍO en sí lo hace el cron robusto (batch + rate-limit + reintentos).
const MAX_RECIPIENTS = 1000;

export type CampaignAudience = "candidates" | "businesses";
export type CampaignInput = {
  audience: CampaignAudience;
  rubro?: string; // solo candidatos (categories)
  zona?: string; // substring sobre city_zone
  subject: string;
  body: string; // texto plano; \n\n = párrafo; admite {nombre}
  dryRun?: boolean; // true = solo contar destinatarios (previsualización)
};

export type CampaignResult = {
  total: number; // destinatarios que matchean el segmento
  enqueued: number; // encolados de verdad (0 en dryRun)
  skipped: { marketing: number; suppressed: number; noEmail: number };
  capped: boolean; // se alcanzó MAX_RECIPIENTS
};

type Recipient = { userId?: string; email: string; name: string };

async function resolveRecipients(input: CampaignInput): Promise<Recipient[]> {
  const admin = await pbAdmin();
  const parts: string[] = [];
  const params: Record<string, unknown> = {};
  if (input.zona) {
    parts.push("city_zone ~ {:zona}");
    params.zona = input.zona;
  }
  if (input.audience === "candidates" && input.rubro) {
    parts.push("categories ~ {:rubro}");
    params.rubro = input.rubro;
  }
  const filter = parts.length ? admin.filter(parts.join(" && "), params) : "";
  const collection = input.audience === "candidates" ? "candidate_profiles" : "business_accounts";

  const rows = await admin
    .collection(collection)
    .getFullList({ filter, expand: "user", sort: "-created", requestKey: null })
    .catch(() => []);

  return rows.slice(0, MAX_RECIPIENTS).map((r) => {
    const user = (r.expand as { user?: { id?: string; email?: string } } | undefined)?.user;
    const name =
      input.audience === "candidates" ? ((r.name as string) || "").split(/\s+/)[0] || "" : (r.business_name as string) || "";
    return { userId: user?.id, email: (user?.email as string) || "", name };
  });
}

function buildRendered(subject: string, body: string, name: string, unsubscribeHref: string) {
  const p = (s: string) => s.replace(/\{nombre\}/g, name || "");
  const finalSubject = p(subject);
  const bodyHtml = p(body)
    .split(/\n{2,}/)
    .filter((s) => s.trim())
    .map((par) => `<p style="margin:0 0 16px 0;">${escapeHtml(par).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = renderEmailLayout({
    heading: finalSubject,
    bodyHtml,
    preferencesHref: `${BASE_URL}/configuracion/notificaciones`,
    unsubscribeHref,
  });
  return { subject: finalSubject, html, text: stripHtmlForText(html) };
}

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function runCampaign(input: CampaignInput): Promise<CampaignResult> {
  const recipients = await resolveRecipients(input);
  const result: CampaignResult = {
    total: recipients.length,
    enqueued: 0,
    skipped: { marketing: 0, suppressed: 0, noEmail: 0 },
    capped: recipients.length >= MAX_RECIPIENTS,
  };

  for (const r of recipients) {
    if (!r.email) {
      result.skipped.noEmail += 1;
      continue;
    }
    // Gate de marketing + supresión antes de encolar: no molestamos a quien se
    // dio de baja ni a direcciones suprimidas (rebotes/quejas).
    let unsubscribeToken = "";
    if (r.userId) {
      const prefs = await getOrCreatePreferences(r.userId).catch(() => null);
      if (prefs && !prefs.marketing) {
        result.skipped.marketing += 1;
        continue;
      }
      unsubscribeToken = prefs?.unsubscribeToken || "";
    }
    if (await isSuppressed(r.email)) {
      result.skipped.suppressed += 1;
      continue;
    }
    if (input.dryRun) continue;

    const unsubscribeHref = unsubscribeToken ? `${BASE_URL}/api/email/unsubscribe?token=${unsubscribeToken}` : "";
    const rendered = buildRendered(input.subject, input.body, r.name, unsubscribeHref);
    // Se ENCOLA (scheduled_for = ahora); el cron flush lo manda con rate-limit y
    // reintentos. Así una campaña grande no se envía toda de golpe ni bloquea.
    await enqueueEmail({
      type: "campaign",
      to: r.email,
      userId: r.userId,
      rendered,
      unsubscribeUrl: unsubscribeHref || undefined,
      scheduledFor: new Date(),
    }).then(() => {
      result.enqueued += 1;
    }).catch(() => {});
  }

  return result;
}
