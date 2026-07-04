"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { Card } from "@/components/ui/Card";

type InvitationRecord = {
  id: string;
  message: string;
  expand?: {
    business?: { business_name?: string };
    job_post?: { role?: string; name?: string; slug?: string };
  };
};

// Bandeja de invitaciones "a postularse" que ve el candidato en su editor.
// Aceptar crea la postulación (server-side); rechazar la descarta. Solo se
// muestran las pendientes (status = enviada).
export function InvitationsInbox({ candidateId }: { candidateId: string }) {
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    pb()
      .collection("candidate_invitations")
      .getFullList<InvitationRecord>({
        filter: `candidate = "${candidateId}" && status = "enviada"`,
        expand: "job_post,business",
        sort: "-created",
        requestKey: null,
      })
      .then(setInvitations)
      .catch(() => setInvitations([]));
  }, [candidateId]);

  async function respond(id: string, action: "accept" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/candidate-invitations/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, action }),
      });
      if (res.ok) setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // Silencioso: si falla, la invitación queda y puede reintentar.
    } finally {
      setBusyId(null);
    }
  }

  if (invitations.length === 0) return null;

  return (
    <Card className="mb-6">
      <h2 className="font-bold mb-1">
        Te invitaron a postularte
        <span
          className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full align-middle"
          style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)" }}
        >
          {invitations.length}
        </span>
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
        Si aceptás, tu postulación le llega directo a la empresa.
      </p>
      <div className="space-y-3">
        {invitations.map((inv) => {
          const business = inv.expand?.business?.business_name || "Una empresa";
          const job = inv.expand?.job_post?.role || inv.expand?.job_post?.name || "una búsqueda";
          const busy = busyId === inv.id;
          return (
            <div
              key={inv.id}
              className="p-3 rounded-[var(--tucv-radius)] border"
              style={{ borderColor: "var(--tucv-border)" }}
            >
              <p className="text-sm">
                <strong>{business}</strong> te invitó a <strong>{job}</strong>.
              </p>
              {inv.message?.trim() && (
                <p
                  className="text-sm mt-1 pl-3"
                  style={{ color: "var(--tucv-muted)", borderLeft: "3px solid var(--tucv-border)" }}
                >
                  {inv.message.trim()}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => respond(inv.id, "accept")}
                  disabled={busy}
                  className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                  style={{ backgroundColor: "var(--tucv-primary)", color: "#fff", opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? "..." : "Postularme"}
                </button>
                <button
                  type="button"
                  onClick={() => respond(inv.id, "reject")}
                  disabled={busy}
                  className="text-xs font-semibold px-3 py-1.5"
                  style={{ color: "var(--tucv-muted)" }}
                >
                  Descartar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
