import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";

export type NotificationPreferences = {
  id: string;
  user: string;
  applicationsFrequency: "instant" | "daily" | "never";
  companyDigestFrequency: "daily" | "weekly" | "never";
  profileViewsFrequency: "weekly" | "never";
  profileTips: boolean;
  marketing: boolean;
  // Avisos de oportunidades laborales (Opción B): servicio, no marketing. Default
  // ON -- null/ausente se interpreta como true (los perfiles viejos quedan opt-in).
  opportunityAlerts: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  unsubscribeToken: string;
};

function mapRecord(record: Record<string, unknown>): NotificationPreferences {
  return {
    id: record.id as string,
    user: record.user as string,
    applicationsFrequency: (record.applications_frequency as NotificationPreferences["applicationsFrequency"]) || "instant",
    companyDigestFrequency: (record.company_digest_frequency as NotificationPreferences["companyDigestFrequency"]) || "daily",
    profileViewsFrequency: (record.profile_views_frequency as NotificationPreferences["profileViewsFrequency"]) || "weekly",
    profileTips: record.profile_tips !== false,
    marketing: record.marketing === true,
    opportunityAlerts: record.job_opportunities !== false,
    quietHoursStart: typeof record.quiet_hours_start === "number" ? record.quiet_hours_start : null,
    quietHoursEnd: typeof record.quiet_hours_end === "number" ? record.quiet_hours_end : null,
    unsubscribeToken: record.unsubscribe_token as string,
  };
}

/**
 * Crea la fila de preferencias con defaults la primera vez que se necesita
 * (normalmente ya existe -- ver el hook onRecordAfterCreateSuccess("users")
 * en pb_hooks/main.pb.js -- pero esto cubre usuarios creados antes de que
 * ese hook existiera).
 */
export async function getOrCreatePreferences(userId: string): Promise<NotificationPreferences> {
  const admin = await pbAdmin();
  const existing = await admin
    .collection("notification_preferences")
    .getFirstListItem(admin.filter("user = {:user}", { user: userId }))
    .catch(() => null);
  if (existing) return mapRecord(existing as unknown as Record<string, unknown>);

  const created = await admin.collection("notification_preferences").create({
    user: userId,
    applications_frequency: "instant",
    company_digest_frequency: "daily",
    profile_views_frequency: "weekly",
    profile_tips: true,
    marketing: false,
    job_opportunities: true,
  });
  return mapRecord(created as unknown as Record<string, unknown>);
}

export async function getPreferencesByUnsubscribeToken(token: string): Promise<NotificationPreferences | null> {
  const admin = await pbAdmin();
  const record = await admin
    .collection("notification_preferences")
    .getFirstListItem(admin.filter("unsubscribe_token = {:token}", { token }))
    .catch(() => null);
  return record ? mapRecord(record as unknown as Record<string, unknown>) : null;
}

// Horario silencioso (quiet_hours_start/end): se aplica en
// lib/email/send.ts -- un email que cae dentro de la ventana se encola
// (lib/email/queue.ts) y lo manda /api/cron/flush-email-queue cuando la
// ventana termina, en vez de descartarlo. Ver lib/email/quiet-hours.ts.
