"use client";

import { useState } from "react";
import { pb } from "@/lib/pocketbase";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import { REPORT_REASONS } from "@/lib/constants";
import { Button, LinkButton } from "@/components/ui/Button";
import { inputClass, inputStyle } from "@/components/ui/Field";

// Terciario a propósito -- reportar no es la acción principal de esta
// pantalla (Refactoring UI: una acción que no es la primaria de la
// pantalla no debe competir visualmente con la que sí lo es).
//
// Pide sesión de Google (cualquiera de las dos, postulante o empresa --
// usePostulanteAuth con requireRole:false solo mira si HAY sesión, no si
// tiene perfil) para evitar reportes anónimos masivos, ej. contra un
// competidor. No hace falta tener un perfil armado, solo una cuenta real.
export function ReportBusinessButton({ jobPostId, publicPath }: { jobPostId: string; publicPath: string }) {
  const { isAuthenticated, userId } = usePostulanteAuth({ redirectIfLoggedOut: false, requireRole: false });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!reason || !userId) return;
    setStatus("sending");
    try {
      await pb().collection("business_reports").create({
        job_post: jobPostId,
        reporter: userId,
        reason,
        detail: detail.trim(),
      });
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
        Reportar este negocio
      </button>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="p-3 rounded-[var(--tucv-radius)] text-sm"
        style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}
      >
        <p className="mb-3">Para reportar necesitás ingresar con Google (evita reportes falsos).</p>
        <div className="flex items-center gap-3">
          <LinkButton href={`/postulante/login?next=/b/${publicPath}`} variant="secondary">
            Ingresar con Google
          </LinkButton>
          <button type="button" onClick={() => setOpen(false)} className="text-xs underline" style={{ color: "var(--tucv-muted)" }}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-[var(--tucv-radius)] text-sm"
      style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}
    >
      <p className="font-semibold mb-2">¿Qué pasa con esta búsqueda?</p>
      <select
        className={`${inputClass} mb-2`}
        style={inputStyle}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      >
        <option value="">Elegí un motivo</option>
        {REPORT_REASONS.map((r) => (
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
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs underline"
          style={{ color: "var(--tucv-muted)" }}
        >
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
