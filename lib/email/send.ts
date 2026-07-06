import "server-only";
import { EMAIL_FROM, getResendClient } from "@/lib/email/client";
import { logEmailEvent } from "@/lib/email/log";
import { getOrCreatePreferences, type NotificationPreferences } from "@/lib/email/preferences";
import { enqueueEmail } from "@/lib/email/queue";
import { currentHourInArgentina, isWithinQuietHours, nextQuietHoursEndUtc } from "@/lib/email/quiet-hours";
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
  application_received_candidate: (prefs) => prefs.applicationsFrequency === "instant",
  new_application_company: (prefs) => prefs.applicationsFrequency === "instant",
  // El digest diario de empresa cubre dos preferencias: la explícita
  // ("Impacto diario" = companyDigestFrequency) y la implícita de quien
  // puso "Postulaciones: resumen diario" (applicationsFrequency=daily, que
  // apagó el instantáneo justamente para verlo batcheado acá).
  company_daily_job_digest: (prefs) =>
    prefs.companyDigestFrequency === "daily" || prefs.applicationsFrequency === "daily",
  company_weekly_job_digest: (prefs) => prefs.companyDigestFrequency === "weekly",
  candidate_weekly_profile_views: (prefs) => prefs.profileViewsFrequency !== "never",
  // Alerta Pro de candidatos compatibles nuevos: corre en el cron diario, así
  // que respeta la misma preferencia que el digest diario de empresa (quien lo
  // apagó no recibe este tampoco).
  candidate_match_digest: (prefs) =>
    prefs.companyDigestFrequency === "daily" || prefs.applicationsFrequency === "daily",
  // Campañas (envío masivo desde /admin/correo): son marketing puro -> solo
  // salen si el usuario NO se dio de baja de marketing. La supresión y el
  // unsubscribe se chequean además al encolar.
  campaign: (prefs) => prefs.marketing,
};

export type SendResult = {
  sent: boolean;
  reason?: "suppressed" | "preference" | "no_client" | "error" | "deferred";
};

// Envío real (Resend) + logging + chequeo de supresión. Separado de
// sendTransactionalEmail para que el flush de la cola (app/api/cron/
// flush-email-queue) lo reuse sin volver a pasar por gates/quiet-hours (que
// ya se evaluaron al encolar -- reevaluarlos ahí podría re-diferir el mismo
// email para siempre). Rechequea supresión a propósito: entre encolar y
// mandar pudo rebotar/quejarse la dirección.
export async function deliverEmail(params: {
  type: EmailType;
  to: string;
  userId?: string;
  rendered: RenderedEmail;
  unsubscribeUrl?: string;
  metadata?: Record<string, unknown>;
  skipSuppressionCheck?: boolean;
}): Promise<SendResult> {
  const { type, to, userId, rendered, unsubscribeUrl, metadata, skipSuppressionCheck } = params;

  if (!skipSuppressionCheck && (await isSuppressed(to))) {
    await logEmailEvent({ userId, email: to, type, status: "suppressed", metadata });
    return { sent: false, reason: "suppressed" };
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

export async function sendTransactionalEmail(params: {
  type: EmailType;
  to: string;
  userId?: string;
  rendered: RenderedEmail;
  unsubscribeUrl?: string;
  metadata?: Record<string, unknown>;
  now?: Date;
}): Promise<SendResult> {
  const { type, to, userId, rendered, unsubscribeUrl, metadata } = params;
  // `now` inyectable para tests -- ver el default acá y no un Date.now()
  // suelto adentro.
  const now = params.now ?? new Date();

  if (await isSuppressed(to)) {
    await logEmailEvent({ userId, email: to, type, status: "suppressed", metadata });
    return { sent: false, reason: "suppressed" };
  }

  if (userId) {
    const prefs = await getOrCreatePreferences(userId);

    const gate = GATES[type];
    if (gate && !gate(prefs)) {
      return { sent: false, reason: "preference" };
    }

    // Horario silencioso: si estamos dentro de la ventana del usuario, en vez
    // de descartar el email lo encolamos para después de que termine (lo
    // manda /api/cron/flush-email-queue). "descartar" en silencio sería peor
    // que ignorar la preferencia -- por eso no se aplicaba hasta tener esta
    // cola. Nota: los digests salen del cron a una hora controlada (ej. 9am),
    // así que en la práctica esto solo difiere los avisos instantáneos.
    const hour = currentHourInArgentina(now);
    if (isWithinQuietHours(hour, prefs.quietHoursStart, prefs.quietHoursEnd)) {
      const scheduledFor = nextQuietHoursEndUtc(now, prefs.quietHoursEnd as number);
      await enqueueEmail({ type, to, userId, rendered, unsubscribeUrl, scheduledFor });
      await logEmailEvent({ userId, email: to, type, status: "queued", metadata });
      return { sent: false, reason: "deferred" };
    }
  }

  // Supresión ya chequeada arriba -- no repetir la consulta en el camino
  // caliente (cada postulación pasa por acá).
  return deliverEmail({ type, to, userId, rendered, unsubscribeUrl, metadata, skipSuppressionCheck: true });
}
