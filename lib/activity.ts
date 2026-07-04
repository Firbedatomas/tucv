import "server-only";
import type PocketBase from "pocketbase";

// Tipos de evento del stream de actividad (activity_events). No todos son
// públicos: los sensibles (invitaciones) se registran como "internal" para
// métricas, sin salir en el feed. La anonimización del feed se hace al leer.
export type ActivityType =
  | "candidate_registered"
  | "profile_completed"
  | "public_enabled"
  | "profile_updated"
  | "profile_viewed"
  | "profile_shared"
  | "profile_qr_downloaded"
  | "profile_poster_downloaded"
  | "help_request_shared"
  | "recommendation_created"
  | "recommendation_approved"
  | "recommendation_hidden"
  | "recommendation_rejected"
  | "reference_requested"
  | "reference_submitted"
  | "reference_received"
  | "reference_approved"
  | "reference_hidden"
  | "reference_rejected"
  | "candidate_saved"
  | "candidate_invited_to_job"
  | "contact_requested"
  | "contact_accepted"
  | "contact_rejected"
  | "contact_revealed"
  | "profile_reported"
  | "company_registered"
  | "job_created"
  | "job_shared"
  | "application_sent"
  | "company_invited_candidate";

export type ActivityActor = "candidate" | "company" | "system";
export type ActivityVisibility = "public" | "internal" | "private";

// Emisión best-effort: un evento de actividad NUNCA debe romper el flujo
// principal (registrar, compartir, invitar). Por eso traga cualquier error.
export async function logActivity(
  admin: PocketBase,
  e: {
    type: ActivityType;
    actorType?: ActivityActor;
    city?: string;
    zone?: string;
    jobId?: string;
    candidateId?: string;
    visibility?: ActivityVisibility;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await admin.collection("activity_events").create({
      type: e.type,
      actor_type: e.actorType ?? "system",
      city: e.city ?? "",
      zone: e.zone ?? "",
      job_id: e.jobId ?? "",
      candidate_id: e.candidateId ?? "",
      visibility: e.visibility ?? "public",
      metadata: e.metadata ?? {},
    });
  } catch {
    // Silencioso a propósito.
  }
}
