"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReportType = "profile" | "business" | "content";

type ActionKey =
  | "mark_reviewing"
  | "resolve_no_action"
  | "hide_target"
  | "warn_user"
  | "block_user"
  | "mark_reviewed"
  | "dismiss";

const ACTION_LABELS: Record<ActionKey, string> = {
  mark_reviewing: "Revisando",
  resolve_no_action: "Sin acción",
  hide_target: "Ocultar",
  warn_user: "Advertir",
  block_user: "Bloquear",
  mark_reviewed: "Revisado",
  dismiss: "Descartar",
};

// Acciones ofrecidas por tipo de reporte. Los reportes de contenido
// (referencias/recomendaciones sueltas) no apuntan a un candidato/negocio
// suspendible, así que no muestran Ocultar/Bloquear.
const ACTIONS_BY_TYPE: Record<ReportType, ActionKey[]> = {
  profile: ["mark_reviewing", "hide_target", "warn_user", "block_user", "resolve_no_action", "dismiss"],
  business: ["mark_reviewing", "hide_target", "warn_user", "block_user", "resolve_no_action", "dismiss"],
  content: ["mark_reviewing", "mark_reviewed", "resolve_no_action", "dismiss"],
};

// block_user es destructiva -> tratamiento terciario (link) que sube a rojo
// sólo en el paso de confirmación (ver regla de acciones destructivas).
const DESTRUCTIVE: ActionKey = "block_user";

export function ModerateControls({
  reportType,
  reportId,
}: {
  reportType: ReportType;
  reportId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<ActionKey | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function run(action: ActionKey) {
    if (action === DESTRUCTIVE && !confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setBusy(action);
    try {
      await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, reportId, action }),
      });
      router.refresh();
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {ACTIONS_BY_TYPE[reportType].map((action) => {
        const isDestructive = action === DESTRUCTIVE;
        const label =
          isDestructive && confirming ? "¿Seguro? Confirmar" : ACTION_LABELS[action];
        return (
          <button
            key={action}
            type="button"
            disabled={busy !== null}
            onClick={() => run(action)}
            className="text-xs font-semibold underline hover:opacity-70 transition disabled:opacity-50 whitespace-nowrap"
            style={{ color: isDestructive && confirming ? "#B42318" : "var(--tucv-muted)" }}
          >
            {busy === action ? "..." : label}
          </button>
        );
      })}
    </div>
  );
}
