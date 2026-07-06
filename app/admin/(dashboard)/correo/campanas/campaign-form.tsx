"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass, inputStyle } from "@/components/ui/Field";

type Result = {
  total: number;
  enqueued: number;
  skipped: { optedOut: number; suppressed: number; noEmail: number };
  capped: boolean;
};

export function CampaignForm() {
  const [audience, setAudience] = useState<"candidates" | "businesses">("candidates");
  const [rubro, setRubro] = useState("");
  const [zona, setZona] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<Result | null>(null);
  const [sent, setSent] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(dryRun: boolean) {
    setBusy(true);
    setError("");
    if (dryRun) setSent(null);
    try {
      const res = await fetch("/api/admin/email/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, rubro: rubro || undefined, zona: zona || undefined, subject, body, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo procesar la campaña.");
        return;
      }
      if (dryRun) setPreview(data);
      else {
        setSent(data);
        setPreview(null);
      }
    } catch {
      setError("Error de red. Reintentá.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold">Audiencia</span>
            <select
              className={inputClass}
              style={inputStyle}
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value as "candidates" | "businesses");
                setPreview(null);
              }}
            >
              <option value="candidates">Candidatos</option>
              <option value="businesses">Empresas</option>
            </select>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {audience === "candidates" && (
              <label className="block">
                <span className="text-sm font-semibold">Rubro (opcional)</span>
                <select className={inputClass} style={inputStyle} value={rubro} onChange={(e) => { setRubro(e.target.value); setPreview(null); }}>
                  <option value="">Todos</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="text-sm font-semibold">Zona (opcional)</span>
              <input className={inputClass} style={inputStyle} value={zona} placeholder="Ej: Córdoba" onChange={(e) => { setZona(e.target.value); setPreview(null); }} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Asunto</span>
            <input className={inputClass} style={inputStyle} value={subject} placeholder="Ej: Nuevas oportunidades cerca tuyo" onChange={(e) => setSubject(e.target.value)} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Mensaje</span>
            <textarea className={inputClass} style={inputStyle} rows={7} value={body} placeholder="Hola {nombre}, ..." onChange={(e) => setBody(e.target.value)} />
            <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
              Usá <code>{"{nombre}"}</code> para el primer nombre. Doble salto de línea = párrafo nuevo. Se agrega
              solo el pie con el link para darse de baja.
            </span>
          </label>

          {error && <p className="text-sm" style={{ color: "var(--tucv-primary)" }}>{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => run(true)} disabled={busy}>
              {busy ? "..." : "Previsualizar destinatarios"}
            </Button>
          </div>
        </div>
      </Card>

      {preview && (
        <Card>
          <p className="font-bold mb-1">{preview.total} destinatarios en el segmento</p>
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Se saltean: {preview.skipped.optedOut} sin avisos de oportunidades · {preview.skipped.suppressed} suprimidos ·{" "}
            {preview.skipped.noEmail} sin email.{preview.capped ? " (tope de 1000 alcanzado)" : ""}
          </p>
          <p className="text-sm mt-2 mb-3">
            Se van a encolar aprox. <strong>{preview.total - preview.skipped.optedOut - preview.skipped.suppressed - preview.skipped.noEmail}</strong> emails. El envío
            lo hace la cola (rate-limit + reintentos), no de golpe.
          </p>
          <Button
            type="button"
            onClick={() => {
              if (confirm(`¿Enviar la campaña a ~${preview.total - preview.skipped.optedOut - preview.skipped.suppressed - preview.skipped.noEmail} destinatarios?`)) run(false);
            }}
            disabled={busy || !subject.trim() || !body.trim()}
          >
            {busy ? "Encolando..." : "Enviar campaña"}
          </Button>
        </Card>
      )}

      {sent && (
        <Card>
          <p className="font-bold" style={{ color: "#128C4A" }}>Campaña encolada ✓</p>
          <p className="text-sm mt-1">
            {sent.enqueued} emails encolados. Se van enviando por la cola (podés ver el estado en la corrida del
            cron de emails). Saltados: {sent.skipped.optedOut} sin avisos oportunidades · {sent.skipped.suppressed} suprimidos ·{" "}
            {sent.skipped.noEmail} sin email.
          </p>
        </Card>
      )}
    </div>
  );
}
