"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { relationLabel, type ReferenceStatus } from "@/lib/references";
import { publicDisplayName } from "@/lib/candidate-visibility";

type Rec = {
  id: string;
  recommender_name: string;
  relation: string;
  text: string;
  show_name: boolean;
  status: ReferenceStatus;
};

const STATUS_LABEL: Record<ReferenceStatus, string> = {
  pending: "Pendiente",
  approved: "Visible en tu perfil",
  hidden: "Oculta",
  rejected: "Rechazada",
};

// El dueño revisa las recomendaciones recibidas y aprueba / oculta / rechaza.
export function RecommendationsManager() {
  const [recs, setRecs] = useState<Rec[]>([]);

  useEffect(() => {
    pb()
      .collection("recommendations")
      .getFullList<Rec>({ sort: "-created", requestKey: null })
      .then(setRecs)
      .catch(() => setRecs([]));
  }, []);

  async function act(id: string, action: "approve" | "hide" | "reject") {
    const res = await fetch(`/api/recommendations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pb().authStore.token, action }),
    });
    if (res.ok) {
      const map: Record<string, ReferenceStatus> = { approve: "approved", hide: "hidden", reject: "rejected" };
      setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, status: map[action] } : r)));
    }
  }

  if (recs.length === 0) return null;

  const btn = "text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border";
  const btnStyle = { borderColor: "var(--tucv-border)", color: "var(--tucv-text)" };

  return (
    <div className="mb-4 p-5 sm:p-6 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)" }}>
      <h2 className="font-bold mb-3">Recomendaciones recibidas</h2>
      <div className="space-y-3">
        {recs.map((r) => (
          <div key={r.id} className="p-3 rounded-[var(--tucv-radius)] border" style={{ borderColor: "var(--tucv-border)" }}>
            <p className="text-sm">
              <strong>{r.show_name && r.recommender_name ? publicDisplayName(r.recommender_name) : "Alguien"}</strong>
              {r.relation ? ` · ${relationLabel(r.relation)}` : ""}
            </p>
            {r.text && (
              <p className="text-sm mt-1" style={{ color: "var(--tucv-text)" }}>
                {r.text}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
              {STATUS_LABEL[r.status]} · {r.show_name ? "muestra su nombre" : "anónima"}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {r.status !== "approved" && (
                <button type="button" onClick={() => act(r.id, "approve")} className={btn} style={{ backgroundColor: "var(--tucv-primary)", color: "#fff", border: "none" }}>
                  Aprobar
                </button>
              )}
              {r.status === "approved" && (
                <button type="button" onClick={() => act(r.id, "hide")} className={btn} style={btnStyle}>
                  Ocultar
                </button>
              )}
              {r.status !== "rejected" && (
                <button type="button" onClick={() => act(r.id, "reject")} className="text-xs font-semibold px-3 py-1.5" style={{ color: "var(--tucv-muted)" }}>
                  Rechazar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
