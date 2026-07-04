"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass, inputStyle } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Template = { id: string; name: string; subject: string; body_html: string; section: string };

export function ReplyComposer({ threadId, defaultSubject }: { threadId: string; defaultSubject: string }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [subject, setSubject] = useState(defaultSubject);
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/admin/email/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.items ?? []))
      .catch(() => {});
  }, []);

  function applyTemplate(id: string) {
    const t = templates.find((tpl) => tpl.id === id);
    if (!t) return;
    setSubject(t.subject);
    setHtml(t.body_html);
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, subject, html }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No pudimos enviar la respuesta.");
        return;
      }
      setSent(true);
      setHtml("");
      router.refresh();
    } catch {
      setError("No pudimos enviar la respuesta.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm font-medium" style={{ color: "var(--tucv-text)" }}>
        Respuesta enviada.{" "}
        <button type="button" className="underline" onClick={() => setSent(false)}>
          Escribir otra
        </button>
      </p>
    );
  }

  return (
    <div>
      {templates.length > 0 && (
        <Field label="Plantilla" hint="Opcional, completa asunto y mensaje.">
          <select className={inputClass} style={inputStyle} defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">Elegir plantilla...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Asunto">
        <input className={inputClass} style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="Mensaje" hint="Podés usar HTML simple (negrita, links, párrafos).">
        <textarea
          className={inputClass}
          style={{ ...inputStyle, minHeight: 160 }}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="Escribí la respuesta..."
        />
      </Field>
      {error && (
        <p className="text-sm mb-3 font-medium" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
      <Button type="button" onClick={handleSend} disabled={sending || !html.trim()}>
        {sending ? "Enviando..." : "Enviar respuesta"}
      </Button>
    </div>
  );
}
