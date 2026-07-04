// Antes esta lógica (vencida/destacada/texto de estado) estaba duplicada
// en JobPostList, ApplicantsPanel y BoostJobButton -- un solo lugar para no
// terminar con una cuarta copia ligeramente distinta.
export type JobPostRawStatus = "draft" | "active" | "paused" | "filled" | "closed" | "";

export type JobPostForStatus = {
  status?: JobPostRawStatus;
  active: boolean;
  expires_at: string;
  featured_until?: string;
};

export type DisplayStatus = "Borrador" | "Activa" | "Promocionada" | "Pausada" | "Cubierta" | "Vencida" | "Cerrada";

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

export function isFeatured(featuredUntil?: string): boolean {
  return Boolean(featuredUntil) && new Date(featuredUntil as string).getTime() > Date.now();
}

// Compat: búsquedas creadas antes de que existiera `status` no lo tienen
// seteado -- se derivan de `active` como si fueran "active"/"closed", igual
// que hace el backfill de la migración para los registros ya existentes.
function normalizedStatus(job: JobPostForStatus): Exclude<JobPostRawStatus, ""> {
  if (job.status) return job.status;
  return job.active ? "active" : "closed";
}

export function displayStatus(job: JobPostForStatus): DisplayStatus {
  const status = normalizedStatus(job);
  if (status === "draft") return "Borrador";
  if (status === "filled") return "Cubierta";
  if (status === "paused") return "Pausada";
  if (status === "closed") return "Cerrada";
  // status === "active"
  if (isExpired(job.expires_at)) return "Vencida";
  if (isFeatured(job.featured_until)) return "Promocionada";
  return "Activa";
}

export function statusBadgeStyle(display: DisplayStatus): { backgroundColor: string; color: string; border: string } {
  switch (display) {
    case "Activa":
      return { backgroundColor: "#DCFCE7", color: "#128C4A", border: "2px solid #128C4A" };
    case "Promocionada":
      return { backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" };
    case "Cubierta":
      return { backgroundColor: "#DCFCE7", color: "#128C4A", border: "2px solid #128C4A" };
    case "Pausada":
      return { backgroundColor: "#FEF3C7", color: "#92400E", border: "2px solid #92400E" };
    case "Borrador":
      return { backgroundColor: "var(--tucv-bg)", color: "var(--tucv-muted)", border: "2px solid var(--tucv-border)" };
    case "Vencida":
    case "Cerrada":
    default:
      return { backgroundColor: "var(--tucv-bg)", color: "var(--tucv-muted)", border: "2px solid var(--tucv-border)" };
  }
}

export function totalShares(shareCounts?: { whatsapp?: number; x?: number; instagram?: number } | null): number {
  if (!shareCounts) return 0;
  return (shareCounts.whatsapp ?? 0) + (shareCounts.x ?? 0) + (shareCounts.instagram ?? 0);
}
