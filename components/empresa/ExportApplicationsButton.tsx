"use client";

import { useState } from "react";
import { pb } from "@/lib/pocketbase";

// Descarga las postulaciones del negocio como CSV (para su CRM/Excel). El
// server valida que sean las propias vía el token de sesión.
export function ExportApplicationsButton() {
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    setBusy(true);
    try {
      const res = await fetch("/api/empresa/applications-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "postulaciones-tucv.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Silencioso: si falla, no rompemos el panel.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      disabled={busy}
      className="inline-flex items-center justify-center font-bold px-5 py-2.5 rounded-[var(--tucv-radius)] border-2 text-sm"
      style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)", opacity: busy ? 0.6 : 1 }}
    >
      {busy ? "Exportando..." : "Exportar CSV"}
    </button>
  );
}
