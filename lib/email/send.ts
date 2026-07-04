import "server-only";
import { EMAIL_FROM, getResendClient } from "@/lib/email/client";
import { logEmailEvent } from "@/lib/email/log";
import { getOrCreatePreferences, type NotificationPreferences } from "@/lib/email/preferences";
import { isSuppressed } from "@/lib/email/suppression";
import type { EmailType, RenderedEmail } from "@/lib/email/types";

// Qué tipos de email respetan una preferencia del usuario antes de mandarse
// (y cuál). Los que no aparecen acá (welcome_*, o cualquier tipo nuevo que
// se agregue sin pensarlo) se mandan siempre -- ver nota en el comentario
// de arriba de GATES sobre por qué eso es intencional y no un descuido.
const GATES: Partial<Record<EmailType, (prefs: NotificationPreferences) => boolean>> = {
  // profile_started y profile_completed avisan sobre el propio perfil del
  // usuario, no dependen de otra persona -- por eso van bajo "profile_tips"
  // (consejos de perfil) y no bajo "marketing".
  profile_started: (prefs) => prefs.profileTips,
  profile_completed: (prefs) => prefs.profileTips,
  public_profile_enabled: (prefs) => prefs.profileTips,
  // "daily" también desactiva el envío instantáneo -- hoy (Fase 1) todavía
  // no existe el digest diario que lo reemplace (Fase 3), así que con
  // "daily" el aviso simplemente no llega hasta que se construya ese
  // digest. No es pérdida de datos: la postulación/búsqueda sigue
  // existiendo, solo cambia CUÁNDO se avisa por mail.
  application_received_candidate: (prefs) => prefs.applicationsFrequency === "instant",
  new_application_company: (prefs) => prefs.applicationsFrequency === "instant",
  // Solo existe la variante diaria hoy -- si eligió "weekly" no hay a qué
  // digest semanal caerle todavía, así que por ahora equivale a "never".
  company_daily_job_digest: (prefs) => prefs.companyDigestFrequency === "daily",
  candidate_weekly_profile_views: (prefs) => prefs.profileViewsFrequency !== "never",
};

export type SendResult = { sent: boolean; reason?: "suppressed" | "preference" | "no_client" | "error" };

export async function sendTransactionalEmail(params: {
  type: EmailType;
  to: string;
  userId?: string;
  rendered: RenderedEmail;
  unsubscribeUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<SendResult> {
  const { type, to, userId, rendered, unsubscribeUrl, metadata } = params;

  if (await isSuppressed(to)) {
    await logEmailEvent({ userId, email: to, type, status: "suppressed", metadata });
    return { sent: false, reason: "suppressed" };
  }

  if (userId) {
    const gate = GATES[type];
    if (gate) {
      const prefs = await getOrCreatePreferences(userId);
      if (!gate(prefs)) {
        return { sent: false, reason: "preference" };
      }
    }
  }

  const resend = getResendClient();
  if (!resend) {
    await logEmailEvent({
      userId,
      email: to,
      type,
      status: "failed",
      error: "RESEND_API_KEY no configurada",
      metadata,
    });
    return { sent: false, reason: "no_client" };
  }

  const headers: Record<string, string> = {};
  if (unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers: Object.keys(headers).length ? headers : undefined,
    tags: [{ name: "type", value: type }],
  });

  if (result.error) {
    await logEmailEvent({ userId, email: to, type, status: "failed", error: result.error.message, metadata });
    return { sent: false, reason: "error" };
  }

  await logEmailEvent({
    userId,
    email: to,
    type,
    status: "sent",
    providerMessageId: result.data?.id,
    metadata,
  });
  return { sent: true };
}
