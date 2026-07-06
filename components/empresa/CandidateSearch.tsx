"use client";

import { useEffect, useMemo, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { waLink } from "@/lib/whatsapp";
import { emptyCandidateFilters, matchesCandidateFilters, narrowByZoneCascade, type CandidateFilters } from "@/lib/candidate-filters";
import { CATEGORIES, labelFor } from "@/lib/constants";
import { experienceYearsLabel } from "@/lib/experience-display";
import { trackEvent } from "@/lib/track";
import { Card } from "@/components/ui/Card";
import { CandidateFilterBar } from "@/components/empresa/CandidateFilterBar";
import { CandidateAvatar, CandidateCardBody, type CandidateLike } from "@/components/empresa/CandidateCardBody";
import {
  SavedCandidateControls,
  type SavedRecord,
  type SavedStatus,
} from "@/components/empresa/SavedCandidateControls";
import { InviteCandidateControls, type InviteJob } from "@/components/empresa/InviteCandidateControls";
import { ContactRequestControls } from "@/components/empresa/ContactRequestControls";

// Estado compacto por candidato en el panel. saved_candidates tiene prioridad
// sobre "visto" (nunca se pisan; viven en tablas distintas).
const SAVED_STATE_LABEL: Record<string, string> = {
  guardado: "Guardado",
  contactado: "Contactado",
  entrevistado: "Entrevistado",
  descartado: "Descartado",
  contratado: "Contratado",
};

// Fase 3C: opciones de orden para el recruiter. Sin búsqueda activa seleccionada
// el default es "recientes"; la promoción por compatibilidad con búsquedas
// activas se aplica DESPUÉS (en el useMemo), así que nunca la pisa.
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "recientes", label: "Más recientes" },
  { value: "experiencia", label: "Más experiencia" },
  { value: "inmediata", label: "Puede empezar ya" },
  { value: "movilidad", label: "Con movilidad" },
  { value: "actual", label: "Trabaja actualmente" },
];

function sortCandidates(list: CandidateLike[], sortBy: string): CandidateLike[] {
  const arr = [...list];
  switch (sortBy) {
    case "experiencia":
      arr.sort((a, b) => (b.total_experience_months ?? 0) - (a.total_experience_months ?? 0));
      break;
    case "inmediata":
      arr.sort((a, b) => Number(!!b.immediate_availability) - Number(!!a.immediate_availability));
      break;
    case "movilidad":
      arr.sort((a, b) => Number(b.has_own_transport === "si") - Number(a.has_own_transport === "si"));
      break;
    case "actual":
      arr.sort((a, b) => Number(!!b.has_current_job) - Number(!!a.has_current_job));
      break;
    default: // recientes
      arr.sort((a, b) => new Date(b.updated ?? 0).getTime() - new Date(a.updated ?? 0).getTime());
  }
  return arr;
}

// Por qué aparece este candidato dado los filtros activos (matching visual).
function computeMatchReasons(c: CandidateLike, filters: CandidateFilters): string[] {
  const reasons: string[] = [];
  if (filters.category) {
    if ((c.experience_categories ?? []).includes(filters.category)) reasons.push(`Trabajó en ${labelFor(CATEGORIES, filters.category)}`);
    else if ((c.categories ?? []).includes(filters.category)) reasons.push(`Quiere ${labelFor(CATEGORIES, filters.category)}`);
  }
  if (filters.task) reasons.push(`Coincide por tarea: ${filters.task}`);
  if (filters.immediateAvailability && c.immediate_availability) reasons.push("Puede empezar ya");
  if (filters.hasOwnTransport && c.has_own_transport === "si") reasons.push("Con movilidad");
  if (filters.hasCurrentJob && c.has_current_job) reasons.push("Trabaja actualmente");
  if (filters.experience && (c.total_experience_months ?? 0) > 0) reasons.push(experienceYearsLabel(c.total_experience_months));
  return reasons.filter(Boolean).slice(0, 4);
}

export function CandidateSearch({
  businessId,
  businessCity,
  businessProvince,
  plan,
}: {
  businessId: string;
  businessCity: string;
  businessProvince: string;
  // Plan del negocio -- habilita la alerta Pro de candidatos compatibles nuevos.
  plan?: string;
}) {
  const isProPlan = plan === "pro" || plan === "multi_local";
  // "Visto por última vez" para la alerta de compatibles nuevos: timestamp en
  // localStorage por negocio. Se lee una sola vez al montar (el valor de la
  // visita ANTERIOR) y abajo un efecto lo pisa con "ahora" para la próxima.
  const [lastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = window.localStorage.getItem(`tucv_cand_seen_${businessId}`);
    return v ? Number(v) : 0;
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`tucv_cand_seen_${businessId}`, String(Date.now()));
    }
  }, [businessId]);
  const [candidates, setCandidates] = useState<CandidateLike[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // WhatsApp revelado por candidato (traído del server tras autorizar).
  const [revealedWhatsapp, setRevealedWhatsapp] = useState<Map<string, string>>(new Map());
  const [filters, setFilters] = useState(emptyCandidateFilters);
  const [sortBy, setSortBy] = useState("recientes");
  // Mini-CRM: candidatos guardados por este negocio, indexados por candidate id.
  const [saved, setSaved] = useState<Map<string, SavedRecord>>(new Map());
  // Estado "visto" (candidate_review_status, colección aparte): candidateId ->
  // id del registro. Independiente de saved_candidates: nunca lo pisa.
  const [reviewed, setReviewed] = useState<Map<string, string>>(new Map());
  // Búsquedas activas del negocio (para invitar) y candidatos ya invitados
  // (candidate id -> etiqueta de la búsqueda) para reflejar el estado.
  const [jobs, setJobs] = useState<InviteJob[]>([]);
  // Rubros (category) de las búsquedas activas del negocio -- para marcar y
  // promover candidatos que coinciden. NUNCA excluye (igual que programas).
  const [jobCategories, setJobCategories] = useState<Set<string>>(new Set());
  const [invited, setInvited] = useState<Map<string, string>>(new Map());
  // Estado de solicitud de contacto por candidato: pending / accepted / rejected.
  const [contactStatus, setContactStatus] = useState<Map<string, string>>(new Map());

  // Wrapper de filtros: detecta qué filtro se ACTIVÓ (cambió a un valor no
  // vacío) para medir uso de filtros en el embudo. Luego setea normalmente.
  function handleFiltersChange(next: CandidateFilters) {
    (Object.keys(next) as (keyof CandidateFilters)[]).forEach((k) => {
      const after = next[k];
      const active = after !== "" && after !== false && after !== 0 && after != null;
      if (filters[k] !== after && active) trackEvent("recruiter_filtro", { filtro: String(k) });
    });
    setFilters(next);
  }

  // Medición del embudo recruiter (24/48h): "entró al panel" es el top del
  // embudo -> permite ver el drop-off hasta abrir_perfil/visto/guardar/contactar.
  useEffect(() => {
    trackEvent("recruiter_panel");
  }, []);

  // Los candidatos ya NO se leen directo de PocketBase (eso mandaba whatsapp/
  // fecha-nac/cv de todos a cualquier logueado). Se piden a un endpoint server
  // que devuelve una proyección segura (sin whatsapp; edad en vez de DOB).
  useEffect(() => {
    fetch("/api/empresa/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pb().authStore.token }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCandidates((d?.candidates as CandidateLike[]) ?? []))
      .catch(() => setCandidates([]));
  }, []);

  useEffect(() => {
    pb()
      .collection("saved_candidates")
      .getFullList<{ id: string; candidate: string; status: SavedStatus; note: string }>({
        filter: `business = "${businessId}"`,
        requestKey: null,
      })
      .then((rows) => {
        setSaved(new Map(rows.map((r) => [r.candidate, { id: r.id, status: r.status || "guardado", note: r.note || "" }])));
      })
      .catch(() => setSaved(new Map()));
  }, [businessId]);

  useEffect(() => {
    pb()
      .collection("candidate_review_status")
      .getFullList<{ id: string; candidate_profile: string }>({ filter: `business_account = "${businessId}"`, requestKey: null })
      .then((rows) => setReviewed(new Map(rows.map((r) => [r.candidate_profile, r.id]))))
      .catch(() => setReviewed(new Map()));
  }, [businessId]);

  // Marca "visto" (idempotente: no duplica; el unique index es el respaldo del
  // server). Se dispara al abrir el perfil o con el botón -- NUNCA solo por
  // aparecer en el listado. No toca saved_candidates.
  async function markViewed(candidateId: string) {
    if (reviewed.has(candidateId)) return;
    trackEvent("recruiter_marcar_visto");
    setReviewed((prev) => new Map(prev).set(candidateId, "pending"));
    try {
      const rec = await pb()
        .collection("candidate_review_status")
        .create({ business_account: businessId, candidate_profile: candidateId, status: "viewed" });
      setReviewed((prev) => new Map(prev).set(candidateId, rec.id));
    } catch {
      // Ya existía (unique) u otro error: lo dejamos marcado optimistamente si ya
      // estaba, o lo sacamos si nunca se creó.
      setReviewed((prev) => {
        const m = new Map(prev);
        if (m.get(candidateId) === "pending") m.delete(candidateId);
        return m;
      });
    }
  }

  useEffect(() => {
    const now = new Date().toISOString();
    pb()
      .collection("job_posts")
      .getFullList<{ id: string; role: string; name: string; category: string }>({
        filter: `business = "${businessId}" && active = true && expires_at > "${now}"`,
        fields: "id,role,name,category",
        requestKey: null,
      })
      .then((rows) => {
        setJobs(rows.map((j) => ({ id: j.id, label: j.role || j.name || "Búsqueda" })));
        setJobCategories(new Set(rows.map((j) => j.category).filter(Boolean)));
      })
      .catch(() => {
        setJobs([]);
        setJobCategories(new Set());
      });
  }, [businessId]);

  useEffect(() => {
    pb()
      .collection("contact_requests")
      .getFullList<{ candidate: string; status: string }>({ requestKey: null })
      .then((rows) => setContactStatus(new Map(rows.map((r) => [r.candidate, r.status]))))
      .catch(() => setContactStatus(new Map()));
  }, []);

  async function requestContact(candidateId: string, jobPostId: string, reason: string) {
    trackEvent("recruiter_contactar", { via: "solicitud" });
    // Optimista: mostramos "pendiente" al toque; revertimos si el server falla.
    setContactStatus((prev) => new Map(prev).set(candidateId, "pending"));
    try {
      const res = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, candidateId, jobPostId, reason }),
      });
      if (!res.ok) {
        setContactStatus((prev) => new Map(prev).set(candidateId, ""));
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: (data as { error?: string }).error };
      }
      return { ok: true };
    } catch {
      setContactStatus((prev) => new Map(prev).set(candidateId, ""));
      return { ok: false, error: "No se pudo enviar la solicitud. Reintentá." };
    }
  }

  // Trae el WhatsApp desde el server SOLO si está autorizado (consent_contact o
  // solicitud aceptada); el server valida y audita (contact_revealed). El número
  // ya no viaja en el listado.
  async function revealContact(candidateId: string) {
    trackEvent("recruiter_contactar", { via: "revelar_whatsapp" });
    try {
      const res = await fetch("/api/contact-requests/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, candidateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data as { whatsapp?: string }).whatsapp) {
        const wa = (data as { whatsapp: string }).whatsapp;
        setRevealedWhatsapp((prev) => new Map(prev).set(candidateId, wa));
      }
    } catch {
      // silencioso
    }
  }

  async function inviteCandidate(candidateId: string, jobPostId: string, message: string) {
    const job = jobs.find((j) => j.id === jobPostId);
    try {
      const res = await fetch("/api/candidate-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pb().authStore.token, candidateId, jobPostId, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInvited((prev) => new Map(prev).set(candidateId, job?.label ?? "tu búsqueda"));
        return { ok: true };
      }
      return { ok: false, error: (data as { error?: string }).error };
    } catch {
      return { ok: false, error: "No se pudo invitar. Reintentá." };
    }
  }

  function upsertSaved(candidateId: string, record: SavedRecord | null) {
    setSaved((prev) => {
      const next = new Map(prev);
      if (record) next.set(candidateId, record);
      else next.delete(candidateId);
      return next;
    });
  }

  async function saveCandidate(candidateId: string) {
    trackEvent("recruiter_guardar");
    try {
      const rec = await pb()
        .collection("saved_candidates")
        .create<{ id: string; status: SavedStatus; note: string }>({
          business: businessId,
          candidate: candidateId,
          status: "guardado",
        });
      upsertSaved(candidateId, { id: rec.id, status: rec.status || "guardado", note: rec.note || "" });
    } catch {
      // Si ya existe (índice único) o falla la red, no rompemos la vista.
    }
  }

  async function patchSaved(candidateId: string, patch: Partial<Pick<SavedRecord, "status" | "note">>) {
    const current = saved.get(candidateId);
    if (!current) return;
    // Optimista: reflejamos el cambio y lo revertimos si el server falla.
    upsertSaved(candidateId, { ...current, ...patch });
    try {
      await pb().collection("saved_candidates").update(current.id, patch);
    } catch {
      upsertSaved(candidateId, current);
    }
  }

  async function removeSaved(candidateId: string) {
    const current = saved.get(candidateId);
    if (!current) return;
    upsertSaved(candidateId, null);
    try {
      await pb().collection("saved_candidates").delete(current.id);
    } catch {
      upsertSaved(candidateId, current);
    }
  }

  // Sin zona tipeada a mano, arrancamos por la ciudad del negocio; si no hay
  // nadie ahí, ampliamos a la provincia; si tampoco, no restringe (ver
  // narrowByZoneCascade). En cuanto la empresa escribe algo en el filtro de
  // zona, toma el control y esto se ignora -- mismo comportamiento de
  // siempre en ese caso.
  const zoneCascade = useMemo(() => {
    if (!candidates || filters.zone) return null;
    return narrowByZoneCascade(candidates, businessCity, businessProvince);
  }, [candidates, filters.zone, businessCity, businessProvince]);

  // Un candidato "coincide con tus búsquedas" si alguno de sus rubros está entre
  // los rubros de las búsquedas activas del negocio. Solo etiqueta/ordena.
  const matchesActiveJob = (c: CandidateLike) =>
    jobCategories.size > 0 && (c.categories ?? []).some((cat) => jobCategories.has(cat));

  const filtered = useMemo(() => {
    if (!candidates) return [];
    const base = zoneCascade ? zoneCascade.candidates : candidates;
    const matched = sortCandidates(
      base.filter((c) => matchesCandidateFilters(c, filters)),
      sortBy,
    );
    if (jobCategories.size === 0) return matched;
    // Promover (NUNCA excluir) los que coinciden con el rubro de alguna búsqueda
    // activa. Partición estable: conserva el orden (ya ordenado) dentro de cada grupo.
    const compat: CandidateLike[] = [];
    const rest: CandidateLike[] = [];
    for (const c of matched) {
      ((c.categories ?? []).some((cat) => jobCategories.has(cat)) ? compat : rest).push(c);
    }
    return [...compat, ...rest];
  }, [candidates, zoneCascade, filters, jobCategories, sortBy]);

  const compatCount = jobCategories.size > 0 ? filtered.filter(matchesActiveJob).length : 0;

  // Alerta Pro: cuántos candidatos compatibles con tus búsquedas activas se
  // actualizaron/aparecieron desde tu última visita. Solo plan pago; en la
  // primera visita (lastSeen 0) no alertamos para no "gritar" sin referencia.
  const newCompatCount = useMemo(() => {
    if (!isProPlan || !candidates || lastSeen === 0 || jobCategories.size === 0) return 0;
    return candidates.filter(
      (c) =>
        (c.categories ?? []).some((cat) => jobCategories.has(cat)) &&
        c.updated != null &&
        new Date(c.updated).getTime() > lastSeen,
    ).length;
  }, [isProPlan, candidates, lastSeen, jobCategories]);

  if (!candidates) {
    return (
      <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
        Buscando candidatos...
      </p>
    );
  }

  if (candidates.length === 0) {
    return (
      <Card className="text-center">
        <h2 className="font-bold mb-2">Todavía no hay candidatos visibles en tu zona</h2>
        <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
          Cuando alguien cargue su perfil y elija que negocios de su zona lo vean, va a aparecer
          acá, aunque no se haya postulado a ninguna de tus búsquedas.
        </p>
      </Card>
    );
  }

  return (
    <div>
      {/* Resumen recruiter (P3): de un vistazo, cuántos hay, cuántos nuevos hoy y
          cuántos pueden arrancar ya. Todo dato real de la lista cargada. */}
      {(() => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const nuevosHoy = candidates.filter(
          (c) => c.updated != null && new Date(c.updated).getTime() >= startOfToday.getTime()
        ).length;
        const inmediatos = candidates.filter((c) => c.immediate_availability).length;
        const stats = [
          { n: candidates.length, l: "visibles" },
          { n: nuevosHoy, l: "nuevos hoy" },
          { n: inmediatos, l: "pueden empezar ya" },
        ];
        return (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div
                key={s.l}
                className="p-3 text-center rounded-[var(--tucv-radius)]"
                style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)", boxShadow: "3px 3px 0 var(--tucv-border)" }}
              >
                <div className="text-2xl font-extrabold" style={{ color: "var(--tucv-text)" }}>
                  {s.n}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wide leading-tight" style={{ color: "var(--tucv-muted)" }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
      {newCompatCount > 0 && (
        <div
          className="mb-4 p-4 rounded-[var(--tucv-radius)] flex flex-wrap items-center gap-x-2 gap-y-1"
          style={{ backgroundColor: "var(--tucv-accent)", border: "2px solid var(--tucv-border)", boxShadow: "var(--tucv-shadow)" }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-[calc(var(--tucv-radius)/1.5)]"
            style={{ backgroundColor: "var(--tucv-text)", color: "var(--tucv-bg)" }}
          >
            Alerta Pro
          </span>
          <span className="font-bold" style={{ color: "var(--tucv-text)" }}>
            {newCompatCount === 1
              ? "1 candidato compatible nuevo"
              : `${newCompatCount} candidatos compatibles nuevos`}{" "}
            desde tu última visita
          </span>
          <span className="text-sm w-full sm:w-auto" style={{ color: "rgba(21,21,21,0.7)" }}>
            Coinciden con el rubro de tus búsquedas activas — están primero en la lista.
          </span>
        </div>
      )}
      {(() => {
        const visibles = candidates.length;
        const filteredView = filtered.length !== visibles;
        // El desglose "visibles vs registrados" + la explicación viven ahora en
        // la caja de "Movimiento en tu zona" (LiveActivity) arriba, para no
        // repetir el mismo texto dos veces en la misma página. Acá dejamos solo
        // el conteo del resultado, que sí depende de los filtros activos.
        return (
          <div className="mb-5">
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              <span className="text-lg font-bold" style={{ color: "var(--tucv-text)" }}>
                {filtered.length}
              </span>{" "}
              {filteredView ? `de ${visibles} ` : ""}
              candidato{(filteredView ? visibles : filtered.length) === 1 ? "" : "s"} visible
              {(filteredView ? visibles : filtered.length) === 1 ? "" : "s"}
              {filteredView ? " con estos filtros" : " en tu zona"}
            </p>
            {compatCount > 0 && (
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--tucv-text)" }}>
                {compatCount === 1 ? "1 candidato coincide" : `${compatCount} candidatos coinciden`} con tus
                búsquedas activas — {compatCount === 1 ? "está" : "están"} primero en la lista.
              </p>
            )}
            {zoneCascade && zoneCascade.tier !== "country" && (
              <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
                {zoneCascade.tier === "city"
                  ? `Mostrando candidatos de ${businessCity}.`
                  : `No hay candidatos en ${businessCity || "tu ciudad"} -- mostrando toda ${businessProvince}.`}
              </p>
            )}
            {zoneCascade && zoneCascade.tier === "country" && (businessCity || businessProvince) && (
              <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
                No hay candidatos en tu zona todavía -- mostrando de todo el país.
              </p>
            )}
          </div>
        );
      })()}

      <div className="flex items-center gap-2 mb-3">
        <label className="text-sm font-semibold shrink-0" htmlFor="cand-sort">
          Ordenar:
        </label>
        <select
          id="cand-sort"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            trackEvent("recruiter_orden", { orden: e.target.value });
          }}
          className="rounded-[var(--tucv-radius)] px-3 py-2 text-sm flex-1 min-w-0"
          style={{ border: "2px solid var(--tucv-border)", backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)" }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <CandidateFilterBar value={filters} onChange={handleFiltersChange} />

      {filtered.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Ningún candidato coincide con esos filtros.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const expanded = expandedId === c.id;
            // Estado compacto: saved_candidates tiene prioridad; luego "visto"; si
            // no, "Nuevo". Nunca se pisan (viven en tablas separadas).
            const savedRec = saved.get(c.id);
            const isReviewed = reviewed.has(c.id);
            const stateLabel = savedRec ? SAVED_STATE_LABEL[savedRec.status] ?? "Guardado" : isReviewed ? "Visto" : "Nuevo";
            const isNew = !savedRec && !isReviewed;
            const stateBadge = (
              <span
                className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-[var(--tucv-radius)] shrink-0"
                style={
                  isNew
                    ? { backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }
                    : savedRec
                      ? { backgroundColor: "var(--tucv-text)", color: "var(--tucv-bg)" }
                      : { backgroundColor: "var(--tucv-bg)", color: "var(--tucv-muted)", border: "1.5px solid var(--tucv-border)" }
                }
              >
                {stateLabel}
              </span>
            );
            return (
              <Card key={c.id} className={expanded ? "lg:col-span-2" : undefined}>
                <div className="flex gap-4">
                  <CandidateAvatar candidate={c} />
                  <div className="min-w-0 flex-1">
                    <CandidateCardBody
                      candidate={c}
                      expanded={expanded}
                      revealedWhatsapp={revealedWhatsapp.get(c.id)}
                      matchReasons={computeMatchReasons(c, filters)}
                      topRightBadge={stateBadge}
                      extraBadges={
                        matchesActiveJob(c) ? [{ label: "Coincide con tu búsqueda", tone: "highlight" }] : undefined
                      }
                    />

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          const opening = !expanded;
                          setExpandedId(opening ? c.id : null);
                          // Marcar visto al ABRIR el perfil (no al cerrarlo ni por listarse).
                          if (opening) {
                            trackEvent("recruiter_abrir_perfil");
                            markViewed(c.id);
                          }
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border"
                        style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
                      >
                        {expanded ? "Ocultar perfil" : "Ver perfil"}
                      </button>
                      {isNew && (
                        <button
                          type="button"
                          onClick={() => markViewed(c.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border"
                          style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-muted)" }}
                        >
                          Marcar visto
                        </button>
                      )}
                      {(() => {
                        const cstatus = contactStatus.get(c.id);
                        // Se puede revelar WhatsApp si el candidato tiene contacto
                        // directo, o si aceptó una solicitud puntual de esta empresa.
                        const canReveal = c.consent_contact || cstatus === "accepted";
                        if (canReveal) {
                          const wa = revealedWhatsapp.get(c.id);
                          return wa ? (
                            <a
                              href={waLink(wa, `Hola ${c.name}, te contacto desde TuCV.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                              style={{ backgroundColor: "#128C4A", color: "#fff" }}
                            >
                              Escribir por WhatsApp
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => revealContact(c.id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                              style={{ backgroundColor: "var(--tucv-primary)", color: "#fff" }}
                            >
                              Contactar
                            </button>
                          );
                        }
                        // El candidato no habilitó contacto directo: se puede
                        // pedir eligiendo búsqueda y motivo (opcionales).
                        return (
                          <ContactRequestControls
                            jobs={jobs}
                            status={cstatus}
                            onRequest={(jobPostId, reason) => requestContact(c.id, jobPostId, reason)}
                          />
                        );
                      })()}
                      <SavedCandidateControls
                        saved={saved.get(c.id) ?? null}
                        expanded={expanded}
                        onSave={() => saveCandidate(c.id)}
                        onStatus={(status) => patchSaved(c.id, { status })}
                        onNote={(note) => patchSaved(c.id, { note })}
                        onRemove={() => removeSaved(c.id)}
                      />
                      <InviteCandidateControls
                        jobs={jobs}
                        invitedLabel={invited.get(c.id) ?? null}
                        onInvite={(jobPostId, message) => inviteCandidate(c.id, jobPostId, message)}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
