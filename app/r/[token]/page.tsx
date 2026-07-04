"use client";

import { use, useState } from "react";
import { RELATION_OPTIONS } from "@/lib/references";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClass, inputStyle } from "@/components/ui/Field";

export default function ReferencePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [company, setCompany] = useState("");
  const [text, setText] = useState("");
  const [showName, setShowName] = useState(true);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !text.trim()) {
      setError("Completá tu nombre y la referencia.");
      return;
    }
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, referrer_name: name, relation, company, text, show_name: showName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setStatus("sent");
      else {
        setStatus("error");
        setError((data as { error?: string }).error ?? "No se pudo enviar.");
      }
    } catch {
      setStatus("error");
      setError("No se pudo enviar. Reintentá.");
    }
  }

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        {status === "sent" ? (
          <Card className="text-center">
            <h1 className="text-xl font-bold mb-2">¡Gracias por tu referencia!</h1>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              La persona la va a revisar antes de que aparezca en su perfil. Un gesto tuyo puede
              ayudarla a conseguir trabajo.
            </p>
          </Card>
        ) : (
          <Card>
            <h1 className="text-xl font-bold mb-1">Dejá una referencia</h1>
            <p className="text-sm mb-5" style={{ color: "var(--tucv-muted)" }}>
              Alguien que conocés te pidió una referencia para su perfil laboral en TuCV. Contá cómo
              es trabajando o qué destacás de esta persona.
            </p>

            <Field label="Tu nombre">
              <input className={inputClass} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </Field>
            <Field label="¿De qué la conocés?">
              <select className={inputClass} style={inputStyle} value={relation} onChange={(e) => setRelation(e.target.value)}>
                <option value="">Elegí una opción</option>
                {RELATION_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Empresa o lugar (opcional)">
              <input className={inputClass} style={inputStyle} value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Tu referencia">
              <textarea
                className={inputClass}
                style={inputStyle}
                rows={4}
                maxLength={800}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ej.: Trabajó conmigo dos años, siempre responsable y con muy buen trato."
              />
            </Field>

            <label className="flex items-start gap-2 text-sm mb-4">
              <input type="checkbox" className="mt-1" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
              <span>
                Acepto que se muestre mi nombre junto a esta referencia. Si lo dejás sin marcar, tu
                referencia suma pero de forma anónima.
              </span>
            </label>

            {error && (
              <p className="text-sm mb-3 font-medium" style={{ color: "#DC2626" }}>
                {error}
              </p>
            )}
            <Button type="button" onClick={submit} disabled={status === "sending"} className="w-full">
              {status === "sending" ? "Enviando..." : "Enviar referencia"}
            </Button>
          </Card>
        )}
      </div>
    </main>
  );
}
