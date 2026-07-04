"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { RELATION_OPTIONS } from "@/lib/references";
import { inputClass, inputStyle } from "@/components/ui/Field";

// Acción de recomendar: solo para usuarios logueados que NO son el dueño del
// perfil. Se auto-oculta si no hay sesión. La API valida email verificado,
// no-autorrecomendación y una-por-usuario.
export function RecommendButton({ candidateId, isOwnProfile }: { candidateId: string; isOwnProfile: boolean }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [relation, setRelation] = useState("");
  const [text, setText] = useState("");
  const [showName, setShowName] = useState(true);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoggedIn(pb().authStore.isValid);
  }, []);

  if (!loggedIn || isOwnProfile) return null;

  async function submit() {
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, candidateId, relation, text, show_name: showName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setStatus("sent");
      else {
        setStatus("error");
        setError((data as { error?: string }).error ?? "No se pudo recomendar.");
      }
    } catch {
      setStatus("error");
      setError("No se pudo recomendar. Reintentá.");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm mt-4" style={{ color: "#128C4A" }}>
        ¡Gracias! Tu recomendación queda pendiente de que la persona la apruebe.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold px-4 py-2 rounded-[var(--tucv-radius)] border mt-4"
        style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
      >
        Recomendar este perfil
      </button>
    );
  }

  return (
    <div className="mt-4 p-4 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}>
      <p className="font-semibold text-sm mb-2">Tu recomendación</p>
      <select className={`${inputClass} mb-2`} style={inputStyle} value={relation} onChange={(e) => setRelation(e.target.value)}>
        <option value="">¿De qué lo/la conocés?</option>
        {RELATION_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        className={`${inputClass} mb-2`}
        style={inputStyle}
        rows={3}
        maxLength={500}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Un aval corto (opcional). Ej.: Muy responsable, la recomiendo."
      />
      <label className="flex items-start gap-2 text-sm mb-3">
        <input type="checkbox" className="mt-1" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
        <span>Mostrar mi nombre junto a la recomendación (si no, suma de forma anónima).</span>
      </label>
      {error && (
        <p className="text-sm mb-2 font-medium" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={status === "sending"}
          className="text-sm font-semibold px-4 py-2 rounded-[var(--tucv-radius)]"
          style={{ backgroundColor: "var(--tucv-primary)", color: "#fff", opacity: status === "sending" ? 0.6 : 1 }}
        >
          {status === "sending" ? "Enviando..." : "Enviar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold px-3 py-2" style={{ color: "var(--tucv-muted)" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
