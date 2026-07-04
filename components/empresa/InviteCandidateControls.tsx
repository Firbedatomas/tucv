"use client";

import { useState } from "react";

export type InviteJob = { id: string; label: string };

// Botón "Invitar a mi búsqueda" por candidato: elige una búsqueda activa del
// negocio y manda la invitación. Se despliega inline (no modal) para no tapar
// la card. Una vez invitado, muestra el estado en vez del botón.
export function InviteCandidateControls({
  jobs,
  invitedLabel,
  onInvite,
}: {
  jobs: InviteJob[];
  invitedLabel: string | null;
  onInvite: (jobPostId: string, message: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (invitedLabel) {
    return (
      <span className="text-xs font-semibold" style={{ color: "#128C4A" }}>
        ✓ Invitado a {invitedLabel}
      </span>
    );
  }

  if (jobs.length === 0) {
    return (
      <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
        Creá una búsqueda activa para invitar
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border"
        style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
      >
        Invitar a mi búsqueda
      </button>
    );
  }

  async function send() {
    if (!jobId) return;
    setSending(true);
    setError(null);
    const res = await onInvite(jobId, message.trim());
    setSending(false);
    if (!res.ok) setError(res.error ?? "No se pudo invitar.");
  }

  return (
    <div
      className="w-full mt-1 p-3 rounded-[var(--tucv-radius)] border"
      style={{ borderColor: "var(--tucv-border)" }}
    >
      <label className="block text-xs font-semibold mb-1" style={{ color: "var(--tucv-text)" }}>
        Invitar a la búsqueda
      </label>
      <select
        value={jobId}
        onChange={(e) => setJobId(e.target.value)}
        className="w-full text-sm px-2 py-1.5 rounded-[var(--tucv-radius)] border mb-2"
        style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)", backgroundColor: "var(--tucv-bg)" }}
      >
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.label}
          </option>
        ))}
      </select>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Mensaje opcional (ej. por qué te interesa su perfil)"
        rows={2}
        maxLength={500}
        className="w-full text-sm px-3 py-2 rounded-[var(--tucv-radius)] border mb-2"
        style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)", backgroundColor: "var(--tucv-surface, #fff)" }}
      />
      {error && (
        <p className="text-xs mb-2 font-medium" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
          style={{ backgroundColor: "var(--tucv-primary)", color: "#fff", opacity: sending ? 0.6 : 1 }}
        >
          {sending ? "Enviando..." : "Enviar invitación"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold px-3 py-1.5"
          style={{ color: "var(--tucv-muted)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
