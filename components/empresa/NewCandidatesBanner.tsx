"use client";

import { useEffect, useState } from "react";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";

// Fallback in-app (independiente de Telegram): le muestra al negocio cuántos
// perfiles visibles NUEVOS aparecieron desde su última visita al panel. Usa el
// conteo real de /api/candidate-counts contra un snapshot en localStorage. Si
// Telegram falla, este aviso igual aparece. Primera visita: no alerta (solo
// guarda el punto de partida).
const KEY = "tucv_panel_seen_visibles";

export function NewCandidatesBanner() {
  const [nuevos, setNuevos] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/candidate-counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { visiblesEmpresas?: number } | null) => {
        if (cancelled || !d || typeof d.visiblesEmpresas !== "number") return;
        const actual = d.visiblesEmpresas;
        const prevRaw = window.localStorage.getItem(KEY);
        const prev = prevRaw != null ? Number(prevRaw) : null;
        if (prev != null && actual > prev) setNuevos(actual - prev);
        window.localStorage.setItem(KEY, String(actual));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (nuevos <= 0) return null;

  return (
    <div
      className="mb-5 p-4 rounded-[var(--tucv-radius)] flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
      style={{ backgroundColor: "var(--tucv-accent)", border: "2.5px solid var(--tucv-border)", boxShadow: "4px 4px 0 var(--tucv-border)" }}
    >
      <p className="font-bold" style={{ color: "var(--tucv-text)" }}>
        {nuevos} {nuevos === 1 ? "nuevo perfil visible" : "nuevos perfiles visibles"} desde tu última visita
      </p>
      <TrackedLinkButton href="/empresa/candidatos" event="ver_candidatos" eventProps={{ source: "panel_banner" }} className="shrink-0 text-sm">
        Ver candidatos
      </TrackedLinkButton>
    </div>
  );
}
