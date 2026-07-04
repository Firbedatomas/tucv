"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { Card } from "@/components/ui/Card";

type ContactRequest = {
  id: string;
  reason: string;
  expand?: {
    business?: { business_name?: string };
    job_post?: { role?: string; name?: string };
  };
};

// Solicitudes de contacto pendientes que ve el candidato. Aceptar comparte su
// WhatsApp con esa empresa; rechazar no comparte nada.
export function ContactRequestsInbox({ candidateId }: { candidateId: string }) {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    pb()
      .collection("contact_requests")
      .getFullList<ContactRequest>({
        filter: `candidate = "${candidateId}" && status = "pending"`,
        expand: "business,job_post",
        sort: "-created",
        requestKey: null,
      })
      .then(setRequests)
      .catch(() => setRequests([]));
  }, [candidateId]);

  async function respond(id: string, action: "accept" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/contact-requests/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, action }),
      });
      if (res.ok) setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Silencioso: queda para reintentar.
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <Card className="mb-6">
      <h2 className="font-bold mb-1">
        Empresas que quieren contactarte
        <span
          className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full align-middle"
          style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)" }}
        >
          {requests.length}
        </span>
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
        Si aceptás, le compartimos tu WhatsApp a esa empresa. Si no, no se comparte nada.
      </p>
      <div className="space-y-3">
        {requests.map((r) => {
          const business = r.expand?.business?.business_name || "Una empresa";
          const job = r.expand?.job_post?.role || r.expand?.job_post?.name;
          const busy = busyId === r.id;
          return (
            <div key={r.id} className="p-3 rounded-[var(--tucv-radius)] border" style={{ borderColor: "var(--tucv-border)" }}>
              <p className="text-sm">
                <strong>{business}</strong> quiere contactarte{job ? ` por ${job}` : ""}.
              </p>
              {r.reason?.trim() && (
                <p className="text-sm mt-1 pl-3" style={{ color: "var(--tucv-muted)", borderLeft: "3px solid var(--tucv-border)" }}>
                  {r.reason.trim()}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => respond(r.id, "accept")}
                  disabled={busy}
                  className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                  style={{ backgroundColor: "#128C4A", color: "#fff", opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? "..." : "Aceptar y compartir WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={() => respond(r.id, "reject")}
                  disabled={busy}
                  className="text-xs font-semibold px-3 py-1.5"
                  style={{ color: "var(--tucv-muted)" }}
                >
                  Rechazar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
