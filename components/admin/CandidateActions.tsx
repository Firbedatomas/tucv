"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CandidateActions({ id, suspended }: { id: string; suspended: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function toggleSuspended() {
    setBusy(true);
    try {
      await fetch(`/api/admin/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: !suspended }),
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
      await fetch(`/api/admin/candidates/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={toggleSuspended}
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
