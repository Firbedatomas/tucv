"use client";

import { useState } from "react";
import { pb } from "@/lib/pocketbase";
import { PROFILE_REPORT_REASONS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { inputClass, inputStyle } from "@/components/ui/Field";

// A diferencia de ReportBusinessButton (que pide login para evitar reportes
// masivos falsos), acá no hay ninguna cuenta que pedir -- ver
// profile_reports.createRule y el límite por IP en
// pb_hooks/main.pb.js (onRecordCreateRequest("profile_reports")).
export function ReportProfileButton({ candidateId }: { candidateId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!reason) return;
    setStatus("sending");
    try {
      await pb().collection("profile_reports").create({ candidate: candidateId, reason, detail: detail.trim() });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-xs" style={{ color: "var(--tucv-muted)" }}>
        Gracias, lo vamos a revisar.
      </p>
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
    <div
      className="p-3 rounded-[var(--tucv-radius)] text-sm"
      style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}
    >
      <p className="font-semibold mb-2">¿Qué pasa con este perfil?</p>
      <select className={`${inputClass} mb-2`} style={inputStyle} value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="">Elegí un motivo</option>
        {PROFILE_REPORT_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        className={`${inputClass} mb-3`}
        style={inputStyle}
        rows={2}
        placeholder="Contanos más (opcional)"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={submit} disabled={!reason || status === "sending"}>
          {status === "sending" ? "Enviando..." : "Enviar reporte"}
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs underline" style={{ color: "var(--tucv-muted)" }}>
          Cancelar
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs mt-2 font-medium" style={{ color: "#DC2626" }}>
          No pudimos enviar el reporte. Probá de nuevo.
        </p>
      )}
    </div>
  );
}
