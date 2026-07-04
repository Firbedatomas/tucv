"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClass, inputStyle } from "@/components/ui/Field";

type Template = { id: string; name: string; section: string; subject: string; body_html: string };

const EMPTY: Omit<Template, "id"> = { name: "", section: "", subject: "", body_html: "" };

export function TemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Template, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/email/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.items ?? []))
      .catch(() => {});
  }

  useEffect(load, []);

  function startEdit(t: Template) {
    setEditingId(t.id);
    setForm({ name: t.name, section: t.section, subject: t.subject, body_html: t.body_html });
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = editingId
        ? await fetch(`/api/admin/email/templates/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name,
              section: form.section,
              subject: form.subject,
              bodyHtml: form.body_html,
            }),
          })
        : await fetch("/api/admin/email/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name,
              section: form.section,
              subject: form.subject,
              bodyHtml: form.body_html,
            }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No pudimos guardar la plantilla.");
        return;
      }
      startNew();
      load();
    } catch {
      setError("No pudimos guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/email/templates/${id}`, { method: "DELETE" }).catch(() => {});
    if (editingId === id) startNew();
    load();
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        {templates.length === 0 ? (
          <Card>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              Todavía no hay plantillas.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{t.name}</p>
                    <p className="text-sm truncate" style={{ color: "var(--tucv-muted)" }}>
                      {t.subject}
                    </p>
                    {t.section && (
                      <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
                        Sección: {t.section}@tucv.ar
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => startEdit(t)}>
                      Editar
                    </Button>
                    <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => remove(t.id)}>
                      Borrar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card>
        <h2 className="font-semibold mb-4">{editingId ? "Editar plantilla" : "Nueva plantilla"}</h2>
        <Field label="Nombre">
          <input
            className={inputClass}
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <Field label="Sección" hint="Opcional. Ej: soporte (para soporte@tucv.ar). Vacío = todas.">
          <input
            className={inputClass}
            style={inputStyle}
            value={form.section}
            onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
          />
        </Field>
        <Field label="Asunto">
          <input
            className={inputClass}
            style={inputStyle}
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
        </Field>
        <Field label="Mensaje">
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 160 }}
            value={form.body_html}
            onChange={(e) => setForm((f) => ({ ...f, body_html: e.target.value }))}
          />
        </Field>
        {error && (
          <p className="text-sm mb-3 font-medium" style={{ color: "#DC2626" }}>
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={save}
            disabled={saving || !form.name.trim() || !form.subject.trim() || !form.body_html.trim()}
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear plantilla"}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={startNew}>
              Cancelar
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
