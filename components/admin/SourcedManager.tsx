"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { waLink } from "@/lib/whatsapp";
import { buildOutreachMessage } from "@/lib/sourced-outreach";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass, inputStyle } from "@/components/ui/Field";

export type SourcedRow = {
  id: string;
  name: string;
  cityZone: string;
  slug: string;
  status: string;
  sourceType: string;
  contactPhone: string;
  contactEmail: string;
  instagram: string;
  jobCount: number;
  interestCount: number;
  roleExample: string;
  logoUrl: string;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  detected: { label: "Detectada", color: "var(--tucv-muted)" },
  contacted: { label: "Contactada", color: "#B06A00" },
  claimed: { label: "Reclamada", color: "#12854A" },
  opted_out: { label: "Baja", color: "#C6362A" },
};

const SOURCE_OPTIONS = [
  ["instagram", "Instagram"],
  ["gmaps", "Google Maps"],
  ["website", "Web propia"],
  ["facebook", "Facebook"],
  ["google_jobs", "Google for Jobs"],
  ["camara", "Cámara de comercio"],
  ["municipio", "Municipio / bolsa"],
  ["otro", "Otra"],
];

type NewSearch = { role: string; snippet: string };

export function SourcedManager({ rows }: { rows: SourcedRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [outreachId, setOutreachId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [logoEditId, setLogoEditId] = useState<string | null>(null);

  async function setLogo(id: string, url: string) {
    await fetch(`/api/admin/sourced/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: url }),
    });
    setLogoEditId(null);
    router.refresh();
  }

  const totals = {
    detected: rows.filter((r) => r.status === "detected").length,
    contacted: rows.filter((r) => r.status === "contacted").length,
    claimed: rows.filter((r) => r.status === "claimed").length,
    interest: rows.reduce((s, r) => s + r.interestCount, 0),
  };

  async function patchStatus(id: string, status: string) {
    await fetch(`/api/admin/sourced/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar esta empresa detectada y sus búsquedas?")) return;
    await fetch(`/api/admin/sourced/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {[
          ["Detectadas", totals.detected],
          ["Contactadas", totals.contacted],
          ["Reclamadas", totals.claimed],
          ["Interesados (total)", totals.interest],
        ].map(([label, n]) => (
          <div key={label} className="px-4 py-2 rounded-[var(--tucv-radius)]" style={{ border: "1.5px solid var(--tucv-border)" }}>
            <div className="text-lg font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>{n}</div>
            <div className="text-xs" style={{ color: "var(--tucv-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      <div>
        <Button type="button" variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cerrar" : "+ Nueva empresa detectada"}
        </Button>
      </div>

      {showForm && <SeedForm onDone={() => { setShowForm(false); router.refresh(); }} />}

      {/* Lista */}
      {rows.length === 0 ? (
        <Card>
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Todavía no sembraste ninguna empresa. Empezá con &quot;+ Nueva empresa detectada&quot;.
          </p>
        </Card>
      ) : (
        <div className="rounded-[var(--tucv-radius)] overflow-hidden" style={{ border: "2px solid var(--tucv-border)" }}>
          {rows.map((r, i) => {
            const st = STATUS_LABEL[r.status] || STATUS_LABEL.detected;
            const msg = buildOutreachMessage({
              slug: r.slug,
              cityZone: r.cityZone,
              sourceType: r.sourceType,
              interestCount: r.interestCount,
              roleExample: r.roleExample,
            });
            return (
              <div key={r.id} style={{ borderTop: i > 0 ? "1px solid var(--tucv-border)" : undefined }}>
                <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setLogoEditId(logoEditId === r.id ? null : r.id)}
                      title="Editar logo"
                      className="shrink-0 w-10 h-10 rounded-[var(--tucv-radius)] flex items-center justify-center text-sm font-bold overflow-hidden"
                      style={{ backgroundColor: "var(--tucv-bg)", border: r.logoUrl ? "1.5px solid var(--tucv-border)" : "1.5px dashed var(--tucv-border)", color: "var(--tucv-muted)" }}
                    >
                      {r.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.logoUrl} alt="" className="w-full h-full" style={{ objectFit: "contain" }} />
                      ) : (
                        "+"
                      )}
                    </button>
                    <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold truncate">{r.name}</span>
                      <span className="text-xs font-semibold" style={{ color: st.color }}>{st.label}</span>
                    </div>
                    <div className="text-xs" style={{ color: "var(--tucv-muted)" }}>
                      {r.cityZone || "—"} · {r.jobCount} búsqueda{r.jobCount !== 1 ? "s" : ""} ·{" "}
                      <strong style={{ color: r.interestCount > 0 ? "var(--tucv-text)" : "var(--tucv-muted)" }}>
                        {r.interestCount} interesado{r.interestCount !== 1 ? "s" : ""}
                      </strong>
                    </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <a href={`/e/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-2.5 py-1.5 rounded-[var(--tucv-radius)]" style={{ border: "1.5px solid var(--tucv-border)" }}>
                      Ver página
                    </a>
                    <button type="button" onClick={() => { setOutreachId(outreachId === r.id ? null : r.id); setCopied(false); }} className="text-xs font-semibold px-2.5 py-1.5 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-accent)", border: "1.5px solid var(--tucv-border)" }}>
                      Outreach
                    </button>
                    {r.status !== "opted_out" && (
                      <button type="button" onClick={() => patchStatus(r.id, "opted_out")} className="text-xs px-2.5 py-1.5 rounded-[var(--tucv-radius)]" style={{ border: "1.5px solid var(--tucv-border)", color: "var(--tucv-muted)" }}>
                        Baja
                      </button>
                    )}
                    <button type="button" onClick={() => remove(r.id)} className="text-xs px-2.5 py-1.5 rounded-[var(--tucv-radius)]" style={{ border: "1.5px solid var(--tucv-border)", color: "#C6362A" }}>
                      Borrar
                    </button>
                  </div>
                </div>

                {logoEditId === r.id && (
                  <div className="px-4 pb-4">
                    <LogoEditor current={r.logoUrl} onSave={(url) => setLogo(r.id, url)} onCancel={() => setLogoEditId(null)} />
                  </div>
                )}

                {outreachId === r.id && (
                  <div className="px-4 pb-4">
                    <textarea readOnly value={msg} rows={5} className={inputClass} style={{ ...inputStyle, fontSize: 13 }} />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {r.contactPhone && (
                        <a href={waLink(r.contactPhone, msg)} target="_blank" rel="noopener noreferrer" className="text-sm font-bold px-4 py-2 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "#128C4A", color: "#fff" }}>
                          WhatsApp
                        </a>
                      )}
                      {r.instagram && (
                        <a href={r.instagram.startsWith("http") ? r.instagram : `https://instagram.com/${r.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold px-4 py-2 rounded-[var(--tucv-radius)]" style={{ border: "1.5px solid var(--tucv-border)" }}>
                          Instagram
                        </a>
                      )}
                      <button type="button" onClick={() => { navigator.clipboard?.writeText(msg); setCopied(true); }} className="text-sm font-semibold px-4 py-2 rounded-[var(--tucv-radius)]" style={{ border: "1.5px solid var(--tucv-border)" }}>
                        {copied ? "Copiado ✓" : "Copiar"}
                      </button>
                      {r.status === "detected" && (
                        <button type="button" onClick={() => patchStatus(r.id, "contacted")} className="text-sm font-semibold px-4 py-2 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-accent)", border: "1.5px solid var(--tucv-border)" }}>
                          Marcar contactada
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeedForm({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState({ name: "", rubro: "", cityZone: "", contactPhone: "", instagram: "", sourceType: "instagram", sourceUrl: "" });
  const [searches, setSearches] = useState<NewSearch[]>([{ role: "", snippet: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof v>(k: K, val: string) {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (!v.name.trim()) {
      setError("Poné el nombre de la empresa.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sourced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, searches: searches.filter((s) => s.role.trim()) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "No se pudo guardar.");
        return;
      }
      onDone();
    } catch {
      setError("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={inputClass} style={inputStyle} placeholder="Nombre del negocio *" value={v.name} onChange={(e) => set("name", e.target.value)} />
          <input className={inputClass} style={inputStyle} placeholder="Rubro (ej: Gastronomía)" value={v.rubro} onChange={(e) => set("rubro", e.target.value)} />
          <input className={inputClass} style={inputStyle} placeholder="Zona (ej: Nueva Córdoba)" value={v.cityZone} onChange={(e) => set("cityZone", e.target.value)} />
          <input className={inputClass} style={inputStyle} placeholder="Teléfono / WhatsApp" value={v.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
          <input className={inputClass} style={inputStyle} placeholder="Instagram (@ o URL)" value={v.instagram} onChange={(e) => set("instagram", e.target.value)} />
          <select className={inputClass} style={inputStyle} value={v.sourceType} onChange={(e) => set("sourceType", e.target.value)}>
            {SOURCE_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <input className={inputClass} style={inputStyle} placeholder="URL de la fuente (el post/aviso público)" value={v.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} />

        <div>
          <p className="text-sm font-semibold mb-1">Búsquedas detectadas</p>
          {searches.map((s, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input className={inputClass} style={inputStyle} placeholder="Puesto (ej: Mozo/a)" value={s.role} onChange={(e) => setSearches((arr) => arr.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
              <input className={inputClass} style={inputStyle} placeholder="Detalle (opcional)" value={s.snippet} onChange={(e) => setSearches((arr) => arr.map((x, j) => (j === i ? { ...x, snippet: e.target.value } : x)))} />
            </div>
          ))}
          <button type="button" className="text-sm font-semibold underline" onClick={() => setSearches((arr) => [...arr, { role: "", snippet: "" }])}>
            + Agregar búsqueda
          </button>
        </div>

        {error && <p className="text-sm" style={{ color: "var(--tucv-primary)" }}>{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Guardando..." : "Sembrar empresa"}</Button>
      </form>
    </Card>
  );
}

function LogoEditor({ current, onSave, onCancel }: { current: string; onSave: (url: string) => void; onCancel: () => void }) {
  const [url, setUrl] = useState(current);
  return (
    <div className="flex gap-2 items-center flex-wrap">
      <input
        className={inputClass}
        style={{ ...inputStyle, maxWidth: 360 }}
        placeholder="URL del logo (https://...)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        type="button"
        onClick={() => onSave(url.trim())}
        className="text-sm font-semibold px-3 py-2 rounded-[var(--tucv-radius)]"
        style={{ backgroundColor: "var(--tucv-accent)", border: "1.5px solid var(--tucv-border)" }}
      >
        Guardar
      </button>
      <button type="button" onClick={onCancel} className="text-sm px-3 py-2 rounded-[var(--tucv-radius)]" style={{ color: "var(--tucv-muted)" }}>
        Cancelar
      </button>
    </div>
  );
}
