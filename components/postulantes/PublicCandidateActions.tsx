"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { InviteCandidateControls, type InviteJob } from "@/components/empresa/InviteCandidateControls";

// Datos del negocio que las acciones necesitan (búsquedas activas + qué ya
// hizo con cada candidato). El directorio público monta UNA card por
// candidato (hasta 200), así que si cada card los pidiera por su cuenta serían
// cientos de requests iguales. Los resolvemos una sola vez por negocio y los
// compartimos entre todas las cards con esta caché a nivel módulo.
type BusinessActionsData = {
  jobs: InviteJob[];
  saved: Map<string, string>; // candidateId -> id de la fila saved_candidates
  invited: Map<string, string>; // candidateId -> etiqueta de la búsqueda
  contact: Map<string, string>; // candidateId -> status de la solicitud
};

const cache = new Map<string, Promise<BusinessActionsData>>();

async function loadBusinessActionsData(businessId: string): Promise<BusinessActionsData> {
  const now = new Date().toISOString();
  const [jobRows, savedRows, invitedRows, contactRows] = await Promise.all([
    pb()
      .collection("job_posts")
      .getFullList<{ id: string; role: string; name: string }>({
        filter: `business = "${businessId}" && active = true && expires_at > "${now}"`,
        fields: "id,role,name",
        requestKey: null,
      })
      .catch(() => []),
    pb()
      .collection("saved_candidates")
      .getFullList<{ id: string; candidate: string }>({ filter: `business = "${businessId}"`, requestKey: null })
      .catch(() => []),
    pb()
      .collection("candidate_invitations")
      .getFullList<{ candidate: string; job_post: string }>({ filter: `business = "${businessId}"`, requestKey: null })
      .catch(() => []),
    // Sin filtro explícito: la regla PB de contact_requests ya lo acota al
    // negocio del usuario autenticado (mismo patrón que CandidateSearch).
    pb()
      .collection("contact_requests")
      .getFullList<{ candidate: string; status: string }>({ requestKey: null })
      .catch(() => []),
  ]);

  const jobs = jobRows.map((j) => ({ id: j.id, label: j.role || j.name || "Búsqueda" }));
  const jobLabel = new Map(jobs.map((j) => [j.id, j.label]));

  return {
    jobs,
    saved: new Map(savedRows.map((r) => [r.candidate, r.id])),
    invited: new Map(invitedRows.map((r) => [r.candidate, jobLabel.get(r.job_post) ?? "tu búsqueda"])),
    contact: new Map(contactRows.map((r) => [r.candidate, r.status])),
  };
}

function getBusinessActionsData(businessId: string): Promise<BusinessActionsData> {
  let entry = cache.get(businessId);
  if (!entry) {
    entry = loadBusinessActionsData(businessId);
    cache.set(businessId, entry);
  }
  return entry;
}

// Acciones de empresa sobre un candidato del directorio PÚBLICO. Solo el
// DUEÑO logueado (role "owner") las ve -- para cualquier otro (anónimo,
// postulante, o colaborador con rol acotado) no renderiza nada. Nunca expone
// WhatsApp ni datos de contacto directo: en el directorio público el camino
// correcto es "Solicitar contacto".
export function PublicCandidateActions({ candidateId }: { candidateId: string }) {
  // redirectIfLoggedOut:false -> esto vive en una página pública; un visitante
  // anónimo NO debe ser pateado al login de empresas.
  const { role, business } = useBusinessAuth({ redirectIfLoggedOut: false });
  const businessId = business?.id;
  const isOwner = role === "owner" && !!businessId;

  const [jobs, setJobs] = useState<InviteJob[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [invitedLabel, setInvitedLabel] = useState<string | null>(null);
  const [contactStatus, setContactStatus] = useState<string>("");

  useEffect(() => {
    if (!isOwner || !businessId) return;
    let alive = true;
    getBusinessActionsData(businessId).then((data) => {
      if (!alive) return;
      setJobs(data.jobs);
      setSavedId(data.saved.get(candidateId) ?? null);
      setInvitedLabel(data.invited.get(candidateId) ?? null);
      setContactStatus(data.contact.get(candidateId) ?? "");
    });
    return () => {
      alive = false;
    };
  }, [isOwner, businessId, candidateId]);

  if (!isOwner || !businessId) return null;

  async function saveCandidate() {
    if (savedId || saving) return;
    setSaving(true);
    try {
      const rec = await pb()
        .collection("saved_candidates")
        .create<{ id: string }>({ business: businessId, candidate: candidateId, status: "guardado" });
      setSavedId(rec.id);
    } catch {
      // Índice único (ya guardado) o red: no rompemos la card pública.
    } finally {
      setSaving(false);
    }
  }

  async function removeSaved() {
    if (!savedId) return;
    const prev = savedId;
    setSavedId(null);
    try {
      await pb().collection("saved_candidates").delete(prev);
    } catch {
      setSavedId(prev);
    }
  }

  async function inviteCandidate(jobPostId: string, message: string) {
    const label = jobs.find((j) => j.id === jobPostId)?.label ?? "tu búsqueda";
    try {
      const res = await fetch("/api/candidate-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, candidateId, jobPostId, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInvitedLabel(label);
        return { ok: true };
      }
      return { ok: false, error: (data as { error?: string }).error };
    } catch {
      return { ok: false, error: "No se pudo invitar. Reintentá." };
    }
  }

  async function requestContact() {
    setContactStatus("pending");
    try {
      const res = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, candidateId }),
      });
      if (!res.ok) setContactStatus("");
    } catch {
      setContactStatus("");
    }
  }

  return (
    // Bloque de empresa, separado de las acciones públicas por un borde
    // superior + una etiqueta tenue: quien mira el directorio como empresa
    // reconoce que estas acciones son suyas, sin competir con "Ver perfil".
    <div className="w-full mt-1 pt-3" style={{ borderTop: "1px solid var(--tucv-border)" }}>
      <p className="text-xs font-semibold mb-2" style={{ color: "var(--tucv-muted)" }}>
        Como empresa
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {savedId ? (
          <span className="inline-flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "#128C4A" }}>
              ✓ Guardado
            </span>
            <button
              type="button"
              onClick={removeSaved}
              className="text-xs font-semibold hover:opacity-70 transition"
              style={{ color: "var(--tucv-muted)" }}
            >
              Quitar
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={saveCandidate}
            disabled={saving}
            className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border"
            style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)", opacity: saving ? 0.6 : 1 }}
          >
            Guardar
          </button>
        )}

        {contactStatus === "pending" ? (
          <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
            Solicitud de contacto enviada
          </span>
        ) : contactStatus === "accepted" ? (
          <span className="text-xs font-semibold" style={{ color: "#128C4A" }}>
            ✓ Aceptó tu contacto
          </span>
        ) : contactStatus === "rejected" ? (
          <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
            No aceptó el contacto
          </span>
        ) : (
          <button
            type="button"
            onClick={requestContact}
            className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border"
            style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
          >
            Solicitar contacto
          </button>
        )}

        <InviteCandidateControls jobs={jobs} invitedLabel={invitedLabel} onInvite={inviteCandidate} />
      </div>
    </div>
  );
}
