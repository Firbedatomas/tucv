"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLAN_OPTIONS = [
  { value: "free", label: "Gratis" },
  { value: "pro", label: "Pro" },
  { value: "multi_local", label: "Equipo" },
];

export function BusinessActions({
  id,
  plan,
  verified,
  suspended,
}: {
  id: string;
  plan: string;
  verified: boolean;
  suspended: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // Confirmación de dos clicks para borrar -- no hay modal en este panel
  // todavía y esto es lo mínimo para que un click de más no borre una
  // cuenta entera por accidente. Se resetea sola si no se confirma en el
  // acto (no queda un botón "armado" colgado si la persona se distrae).
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/admin/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 4000);
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/admin/businesses/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="text-xs px-1.5 py-1 rounded-[var(--tucv-radius)]"
        style={{ border: "1.5px solid var(--tucv-border)", backgroundColor: "var(--tucv-surface)" }}
        value={plan}
        disabled={busy}
        onChange={(e) => patch({ plan: e.target.value })}
      >
        {PLAN_OPTIONS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy}
        onClick={() => patch({ verified: !verified })}
        className="text-xs font-semibold underline disabled:opacity-50"
        style={{ color: verified ? "var(--tucv-primary)" : "var(--tucv-muted)" }}
      >
        {verified ? "Verificado" : "Verificar"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => patch({ suspended: !suspended })}
        className="text-xs font-semibold underline disabled:opacity-50"
        style={{ color: "var(--tucv-muted)" }}
      >
        {suspended ? "Reactivar" : "Suspender"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={handleDelete}
        className="text-xs font-semibold underline disabled:opacity-50"
        style={{ color: "#B42318" }}
      >
        {confirmingDelete ? "¿Seguro? Confirmar" : "Eliminar"}
      </button>
    </div>
  );
}
