"use client";

import { useState } from "react";
import type { InviteJob } from "@/components/empresa/InviteCandidateControls";

// Botón "Solicitar contacto" por candidato: despliega inline (no modal) para
// elegir opcionalmente una búsqueda activa y escribir un motivo antes de mandar
// la solicitud. Una vez enviada (o rechazada), muestra el estado en vez del
// botón. El estado "pending" se setea de forma optimista desde el padre.
export function ContactRequestControls({
  jobs,
  status,
  onRequest,
}: {
  jobs: InviteJob[];
  status: string | undefined;
  onRequest: (jobPostId: string, reason: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "pending") {
    return (
      <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
        Solicitud de contacto enviada
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
        No aceptó el contacto
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
        Solicitar contacto
      </button>
    );
  }

  async function send() {
    setSending(true);
    setError(null);
    const res = await onRequest(jobId, reason.trim());
    setSending(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo enviar la solicitud.");
      return;
    }
    setOpen(false);
  }

  return (
    <div
      className="w-full mt-1 p-3 rounded-[var(--tucv-radius)] border"
      style={{ borderColor: "var(--tucv-border)" }}
    >
      {jobs.length > 0 && (
        <>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--tucv-text)" }}>
            Búsqueda relacionada (opcional)
          </label>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="w-full text-sm px-2 py-1.5 rounded-[var(--tucv-radius)] border mb-2"
            style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)", backgroundColor: "var(--tucv-bg)" }}
          >
            <option value="">Sin búsqueda específica</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </>
      )}
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo opcional (ej. por qué querés contactarlo)"
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
          {sending ? "Enviando..." : "Enviar solicitud"}
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
