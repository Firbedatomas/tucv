"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { CATEGORIES } from "@/lib/constants";
import { loadCatalog, type CatalogItem } from "@/lib/catalogs";
import { Button } from "@/components/ui/Button";

// Fase 3A -- gestión de EXPERIENCIAS laborales relacionales (crear/editar/borrar)
// desde /postulante/editar. Escribe directo a candidate_work_experiences y
// candidate_experience_tasks (reglas de owner); el cache lo recalcula el hook.
// El JSON viejo `category_experience` NO se toca (queda de respaldo). Múltiples
// experiencias del mismo rubro permitidas. Nada obligatorio: es opt-in.

type Exp = {
  id: string;
  job_title: string;
  category: string;
  company_name: string;
  city: string;
  start_year: number | null;
  start_month: number | null;
  end_year: number | null;
  end_month: number | null;
  currently_working: boolean;
  description: string;
  tasks: string[]; // labels de tareas (de candidate_experience_tasks)
};

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const NOW_YEAR = 2026;
const YEARS = Array.from({ length: NOW_YEAR - 1969 }, (_, i) => NOW_YEAR - i);

function emptyDraft(): Exp {
  return {
    id: "", job_title: "", category: "", company_name: "", city: "",
    start_year: null, start_month: null, end_year: null, end_month: null,
    currently_working: false, description: "", tasks: [],
  };
}

function periodLabel(e: Exp): string {
  const from = e.start_year ? `${e.start_month ? MONTHS[e.start_month - 1] + " " : ""}${e.start_year}` : "";
  const to = e.currently_working ? "Actualidad" : e.end_year ? `${e.end_month ? MONTHS[e.end_month - 1] + " " : ""}${e.end_year}` : "";
  if (from && to) return `${from} – ${to}`;
  return from || to || "";
}

function catLabel(slug: string): string {
  if (!slug) return "";
  const known = CATEGORIES.find((c) => c.value === slug);
  return known ? known.label : slug;
}

const inputClass = "w-full rounded-[var(--tucv-radius)] px-3 py-2 text-sm";
const inputStyle: React.CSSProperties = { border: "2px solid var(--tucv-border)", backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)" };

export function WorkExperienceManager({
  candidateId,
  legacyCount = 0,
  startOpen = false,
}: {
  candidateId: string;
  // Cantidad de rubros con experiencia en el JSON viejo -- si el usuario no tiene
  // experiencias relacionales pero sí legacy, ofrecemos importarlas.
  legacyCount?: number;
  // Abre el editor de una experiencia nueva al montar (deep-link "agregar").
  startOpen?: boolean;
}) {
  const [exps, setExps] = useState<Exp[] | null>(null);
  const [roles, setRoles] = useState<CatalogItem[]>([]);
  const [taskCatalog, setTaskCatalog] = useState<CatalogItem[]>([]);
  const [draft, setDraft] = useState<Exp | null>(startOpen ? emptyDraft() : null); // null = ninguno abierto
  const [busy, setBusy] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [catOtherOpen, setCatOtherOpen] = useState(false);

  async function loadExps() {
    try {
      const rows = await pb()
        .collection("candidate_work_experiences")
        .getFullList({ filter: `candidate_profile = "${candidateId}"`, sort: "sort_order,-start_year", requestKey: null });
      const taskRows = await pb()
        .collection("candidate_experience_tasks")
        .getFullList({ filter: `candidate_profile = "${candidateId}"`, requestKey: null })
        .catch(() => []);
      const tasksByExp: Record<string, string[]> = {};
      for (const t of taskRows) (tasksByExp[t.experience as string] ??= []).push(t.task as string);
      setExps(
        rows.map((r) => ({
          id: r.id, job_title: r.job_title || "", category: r.category || "", company_name: r.company_name || "",
          city: r.city || "", start_year: r.start_year || null, start_month: r.start_month || null,
          end_year: r.end_year || null, end_month: r.end_month || null, currently_working: !!r.currently_working,
          description: r.description || "", tasks: tasksByExp[r.id] || [],
        })),
      );
    } catch {
      setExps([]);
    }
  }

  useEffect(() => {
    // Carga inicial desde PocketBase (fetch-on-mount): el setState ocurre tras
    // el await/then, patrón legítimo de sync con un sistema externo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadExps();
    loadCatalog("job_roles").then(setRoles);
    loadCatalog("tasks").then(setTaskCatalog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  function openNew() {
    setDraft(emptyDraft());
    setCatOtherOpen(false);
    setTaskInput("");
  }
  function openEdit(e: Exp) {
    setDraft({ ...e });
    setCatOtherOpen(!!e.category && !CATEGORIES.some((c) => c.value === e.category));
    setTaskInput("");
  }

  function addTask(label: string) {
    const t = label.trim();
    if (!t || !draft) return;
    if (!draft.tasks.includes(t)) setDraft({ ...draft, tasks: [...draft.tasks, t] });
    setTaskInput("");
  }

  async function save() {
    if (!draft) return;
    if (!draft.job_title.trim() && !draft.category.trim()) {
      alert("Poné al menos el puesto o el rubro.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        candidate_profile: candidateId,
        job_title: draft.job_title.trim(),
        category: draft.category.trim(),
        company_name: draft.company_name.trim(),
        city: draft.city.trim(),
        start_year: draft.start_year || null,
        start_month: draft.start_month || null,
        end_year: draft.currently_working ? null : draft.end_year || null,
        end_month: draft.currently_working ? null : draft.end_month || null,
        currently_working: draft.currently_working,
        description: draft.description.trim(),
        sort_order: draft.start_year ? NOW_YEAR - draft.start_year : 99,
      };
      let expId = draft.id;
      if (expId) {
        await pb().collection("candidate_work_experiences").update(expId, payload);
      } else {
        const created = await pb().collection("candidate_work_experiences").create(payload);
        expId = created.id;
      }
      // Sincronizar tareas: borrar las existentes de esta experiencia y recrear.
      const existing = await pb()
        .collection("candidate_experience_tasks")
        .getFullList({ filter: `experience = "${expId}"`, requestKey: null })
        .catch(() => []);
      for (const t of existing) await pb().collection("candidate_experience_tasks").delete(t.id).catch(() => {});
      for (const t of draft.tasks) {
        const cat = taskCatalog.find((tc) => tc.label.toLowerCase() === t.toLowerCase());
        await pb()
          .collection("candidate_experience_tasks")
          .create({ experience: expId, candidate_profile: candidateId, task: t, task_catalog: cat?.id || null })
          .catch(() => {});
      }
      setDraft(null);
      await loadExps();
    } catch {
      alert("No se pudo guardar la experiencia. Reintentá.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar esta experiencia?")) return;
    setBusy(true);
    try {
      await pb().collection("candidate_work_experiences").delete(id);
      await loadExps();
    } catch {
      alert("No se pudo borrar. Reintentá.");
    } finally {
      setBusy(false);
    }
  }

  const d = draft;
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-lg font-bold">Experiencias laborales</h2>
        {exps && exps.length > 0 && (
          <span className="text-xs font-semibold" style={{ color: "var(--tucv-muted)" }}>
            {exps.length} cargada{exps.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
        Opcional. Podés cargar varias, incluso del mismo rubro. Sumar tus experiencias hace que más
        comercios te encuentren.
      </p>

      {exps === null ? (
        <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>Cargando…</p>
      ) : (
        <div className="space-y-3">
          {exps.map((e) => (
            <div
              key={e.id}
              className="rounded-[var(--tucv-radius)] p-3"
              style={{ border: "2px solid var(--tucv-border)", backgroundColor: "var(--tucv-surface)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold break-words">{e.job_title || catLabel(e.category) || "Experiencia"}</p>
                  <p className="text-sm break-words" style={{ color: "var(--tucv-muted)" }}>
                    {[e.company_name, catLabel(e.category)].filter(Boolean).join(" · ")}
                  </p>
                  {periodLabel(e) && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--tucv-muted)" }}>{periodLabel(e)}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button type="button" onClick={() => openEdit(e)} className="text-xs font-semibold underline" disabled={busy}>Editar</button>
                  <button type="button" onClick={() => remove(e.id)} className="text-xs font-semibold underline" style={{ color: "var(--tucv-primary)" }} disabled={busy}>Borrar</button>
                </div>
              </div>
              {e.tasks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {e.tasks.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {exps.length === 0 && !d && (
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              Todavía no cargaste experiencias.{legacyCount > 0 ? " Tenés experiencia previa cargada en el formato anterior — se sigue mostrando en tu perfil mientras la pasás acá." : ""}
            </p>
          )}
        </div>
      )}

      {/* Editor inline */}
      {d && (
        <div className="mt-3 rounded-[var(--tucv-radius)] p-4" style={{ border: "2px solid var(--tucv-border)", backgroundColor: "var(--tucv-bg)", boxShadow: "var(--tucv-shadow)" }}>
          <p className="font-bold mb-3">{d.id ? "Editar experiencia" : "Nueva experiencia"}</p>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-semibold">Puesto</span>
              <input className={inputClass} style={inputStyle} list="wem-roles" value={d.job_title} placeholder="Ej: Cajero, Mozo, Vendedora" onChange={(ev) => setDraft({ ...d, job_title: ev.target.value })} />
              <datalist id="wem-roles">{roles.map((r) => <option key={r.id} value={r.label} />)}</datalist>
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Empresa o comercio <span style={{ color: "var(--tucv-muted)" }}>(opcional)</span></span>
              <input className={inputClass} style={inputStyle} value={d.company_name} placeholder="Ej: Supermercado La Esquina" onChange={(ev) => setDraft({ ...d, company_name: ev.target.value })} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Rubro</span>
              <select
                className={inputClass}
                style={inputStyle}
                value={catOtherOpen ? "__otro__" : d.category}
                onChange={(ev) => {
                  if (ev.target.value === "__otro__") { setCatOtherOpen(true); setDraft({ ...d, category: "" }); }
                  else { setCatOtherOpen(false); setDraft({ ...d, category: ev.target.value }); }
                }}
              >
                <option value="">Elegí un rubro…</option>
                {CATEGORIES.filter((c) => c.value !== "otro").map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                <option value="__otro__">Otro (escribir)</option>
              </select>
              {catOtherOpen && (
                <input className={`${inputClass} mt-2`} style={inputStyle} value={d.category} placeholder="Escribí el rubro" onChange={(ev) => setDraft({ ...d, category: ev.target.value })} />
              )}
            </label>

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-sm font-semibold">Desde</span>
                <div className="flex gap-2 mt-1">
                  <select className={inputClass} style={inputStyle} value={d.start_month ?? ""} onChange={(ev) => setDraft({ ...d, start_month: ev.target.value ? Number(ev.target.value) : null })}>
                    <option value="">Mes</option>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <select className={inputClass} style={inputStyle} value={d.start_year ?? ""} onChange={(ev) => setDraft({ ...d, start_year: ev.target.value ? Number(ev.target.value) : null })}>
                    <option value="">Año</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <span className="text-sm font-semibold">Hasta</span>
                <div className="flex gap-2 mt-1">
                  <select className={inputClass} style={inputStyle} value={d.end_month ?? ""} disabled={d.currently_working} onChange={(ev) => setDraft({ ...d, end_month: ev.target.value ? Number(ev.target.value) : null })}>
                    <option value="">Mes</option>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <select className={inputClass} style={inputStyle} value={d.end_year ?? ""} disabled={d.currently_working} onChange={(ev) => setDraft({ ...d, end_year: ev.target.value ? Number(ev.target.value) : null })}>
                    <option value="">Año</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.currently_working} onChange={(ev) => setDraft({ ...d, currently_working: ev.target.checked })} />
              Trabajo actualmente acá
            </label>

            {/* Tareas */}
            <div>
              <span className="text-sm font-semibold">Tareas <span style={{ color: "var(--tucv-muted)" }}>(opcional)</span></span>
              {d.tasks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 my-1.5">
                  {d.tasks.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-[var(--tucv-radius)] flex items-center gap-1" style={{ backgroundColor: "var(--tucv-accent)", border: "1.5px solid var(--tucv-border)" }}>
                      {t}
                      <button type="button" onClick={() => setDraft({ ...d, tasks: d.tasks.filter((x) => x !== t) })} aria-label="Quitar">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input className={inputClass} style={inputStyle} list="wem-tasks" value={taskInput} placeholder="Agregar tarea" onChange={(ev) => setTaskInput(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); addTask(taskInput); } }} />
                <datalist id="wem-tasks">{taskCatalog.map((t) => <option key={t.id} value={t.label} />)}</datalist>
                <Button type="button" variant="secondary" className="shrink-0 text-sm px-3" onClick={() => addTask(taskInput)}>Sumar</Button>
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-semibold">Descripción <span style={{ color: "var(--tucv-muted)" }}>(opcional)</span></span>
              <textarea className={inputClass} style={inputStyle} rows={2} value={d.description} placeholder="Qué hacías, logros, etc." onChange={(ev) => setDraft({ ...d, description: ev.target.value })} />
            </label>

            <div className="flex gap-2 pt-1">
              <Button type="button" onClick={save} disabled={busy} className="text-sm">{busy ? "Guardando…" : "Guardar experiencia"}</Button>
              <Button type="button" variant="secondary" onClick={() => setDraft(null)} disabled={busy} className="text-sm">Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {!d && (
        <button
          type="button"
          onClick={openNew}
          className="mt-3 w-full rounded-[var(--tucv-radius)] py-2.5 text-sm font-bold"
          style={{ border: "2px dashed var(--tucv-border)", color: "var(--tucv-text)" }}
        >
          + Agregar experiencia
        </button>
      )}
    </section>
  );
}
