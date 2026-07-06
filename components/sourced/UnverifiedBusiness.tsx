"use client";

import { useState } from "react";
import { pb } from "@/lib/pocketbase";

type Job = { id: string; role: string; rubro: string; snippet: string; detectedAt: string; interestCount: number };

export function UnverifiedBusiness({
  businessName,
  claimed,
  jobs,
}: {
  businessName: string;
  claimed: boolean;
  jobs: Job[];
}) {
  const [interested, setInterested] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  async function markInterest(jobId: string) {
    if (interested.has(jobId) || busy) return;
    setBusy(jobId);
    try {
      // El token va SOLO si el candidato ya tiene sesión -- el server resuelve
      // su identidad con eso (nunca mandamos un id de candidato desde acá).
      const token = pb().authStore.isValid ? pb().authStore.token : undefined;
      const res = await fetch("/api/sourced-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, token }),
      });
      if (res.ok) setInterested((s) => new Set(s).add(jobId));
    } catch {
      // silencioso: reintentar con otro click
    } finally {
      setBusy(null);
    }
  }

  if (jobs.length === 0) {
    return (
      <div
        className="rounded-[var(--tucv-radius)] px-4 py-5 text-sm text-center"
        style={{ border: "2px solid var(--tucv-border)", color: "var(--tucv-muted)" }}
      >
        Todavía no detectamos búsquedas activas de esta empresa.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--tucv-muted)" }}>
        Búsquedas detectadas
      </h2>
      {jobs.map((job) => {
        const done = interested.has(job.id);
        return (
          <div
            key={job.id}
            className="rounded-[var(--tucv-radius)] p-4"
            style={{ border: "2px solid var(--tucv-border)", backgroundColor: "var(--tucv-surface)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{job.role}</p>
              {(() => {
                const n = job.interestCount + (done ? 1 : 0);
                return n > 0 ? (
                  <span className="shrink-0 text-xs font-semibold" style={{ color: "#128C4A" }}>
                    {n} interesado{n !== 1 ? "s" : ""}
                  </span>
                ) : null;
              })()}
            </div>
            {(job.rubro || job.snippet) && (
              <p className="text-sm mt-0.5" style={{ color: "var(--tucv-muted)" }}>
                {job.snippet || job.rubro}
              </p>
            )}

            {!claimed && (
              <p
                className="text-xs mt-3 px-3 py-2 rounded-[var(--tucv-radius)]"
                style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-muted)", border: "1px solid var(--tucv-border)" }}
              >
                {businessName} <strong>todavía no administra</strong> esta búsqueda en TuCV. No es una
                postulación formal: si te interesa, le avisamos que hay gente de tu zona esperando.
              </p>
            )}

            <div className="mt-3">
              {done ? (
                <span className="text-sm font-semibold" style={{ color: "#12854A" }}>
                  ✓ Le avisamos que te interesa
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => markInterest(job.id)}
                  disabled={busy === job.id}
                  className="text-sm font-bold px-4 py-2.5 rounded-[var(--tucv-radius)] disabled:opacity-50"
                  style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" }}
                >
                  {busy === job.id ? "..." : "Me interesa"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
