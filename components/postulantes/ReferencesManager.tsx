"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { relationLabel, type ReferenceStatus } from "@/lib/references";

type Ref = {
  id: string;
  referrer_name: string;
  relation: string;
  company: string;
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

// Bloque del DUEÑO en su perfil: consigue su link único de referencias, lo
// comparte, y revisa las recibidas (aprobar / ocultar / rechazar). Nada se
// publica sin que apruebe.
export function ReferencesManager() {
  const [link, setLink] = useState<string | null>(null);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/references/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pb().authStore.token }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.url && setLink(d.url))
      .catch(() => {});
    pb()
      .collection("candidate_references")
      .getFullList<Ref>({ sort: "-created", requestKey: null })
      .then(setRefs)
      .catch(() => setRefs([]));
  }, []);

  async function act(id: string, action: "approve" | "hide" | "reject") {
    const res = await fetch(`/api/references/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pb().authStore.token, action }),
    });
    if (res.ok) {
      const map: Record<string, ReferenceStatus> = { approve: "approved", hide: "hidden", reject: "rejected" };
      setRefs((prev) => prev.map((r) => (r.id === id ? { ...r, status: map[action] } : r)));
    }
  }

  const waShare = link
    ? `https://wa.me/?text=${encodeURIComponent(`Hola, ¿me dejarías una referencia para mi perfil de trabajo? Es rapidísimo: ${link}`)}`
    : "#";

  const btn = "text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border";
  const btnStyle = { borderColor: "var(--tucv-border)", color: "var(--tucv-text)" };

  return (
    <div className="mb-4 p-5 sm:p-6 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)" }}>
      <h2 className="font-bold mb-1">Sumá referencias</h2>
      <p className="text-sm mb-3" style={{ color: "var(--tucv-muted)" }}>
        Pedile a un ex jefe, compañero o cliente que te deje una referencia. Compartí tu link — solo
        vos decidís cuáles se muestran.
      </p>

      {link && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <a href={waShare} target="_blank" rel="noopener noreferrer" className={btn} style={{ backgroundColor: "#128C4A", color: "#fff", border: "none" }}>
            Pedir por WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={btn}
            style={btnStyle}
          >
            {copied ? "¡Copiado!" : "Copiar link"}
          </button>
        </div>
      )}

      {refs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tucv-muted)" }}>
            Recibidas
          </p>
          {refs.map((r) => (
            <div key={r.id} className="p-3 rounded-[var(--tucv-radius)] border" style={{ borderColor: "var(--tucv-border)" }}>
              <p className="text-sm">
                <strong>{r.referrer_name}</strong>
                {r.relation ? ` · ${relationLabel(r.relation)}` : ""}
                {r.company ? ` · ${r.company}` : ""}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--tucv-text)" }}>
                {r.text}
              </p>
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
      )}
    </div>
  );
}
