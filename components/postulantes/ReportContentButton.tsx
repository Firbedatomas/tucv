"use client";

import { useState } from "react";
import { inputClass, inputStyle } from "@/components/ui/Field";

const REASONS = [
  { value: "falsa", label: "Parece falsa" },
  { value: "ofensiva", label: "Contenido ofensivo" },
  { value: "spam", label: "Spam" },
  { value: "otro", label: "Otro" },
];

// Link discreto para reportar una referencia/recomendación puntual del perfil
// público. Sin cuenta: el POST va a /api/report-content, que aplica el límite
// por IP. Patrón de UI espejado de ReportProfileButton, en versión mínima.
export function ReportContentButton({
  contentType,
  contentId,
}: {
  contentType: "reference" | "recommendation";
  contentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!reason) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/report-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentId, reason }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
        Gracias, lo vamos a revisar.
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs underline hover:opacity-70 transition"
        style={{ color: "var(--tucv-muted)" }}
      >
        Reportar
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        className={`${inputClass} !w-auto !py-1.5 text-sm`}
        style={inputStyle}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      >
        <option value="">Elegí un motivo</option>
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={submit}
        disabled={!reason || status === "sending"}
        className="text-xs font-semibold underline hover:opacity-70 transition disabled:opacity-40"
        style={{ color: "var(--tucv-text)" }}
      >
        {status === "sending" ? "Enviando..." : "Enviar"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs underline"
        style={{ color: "var(--tucv-muted)" }}
      >
        Cancelar
      </button>
      {status === "error" && (
        <span className="text-xs font-medium" style={{ color: "#DC2626" }}>
          No se pudo enviar.
        </span>
      )}
    </div>
  );
}
