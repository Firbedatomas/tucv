"use client";

import { useEffect, useMemo, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { APPLICATION_STATUS, labelFor, type ScreeningQuestion, type ScreeningAnswer } from "@/lib/constants";
import { waLink } from "@/lib/whatsapp";
import { emptyCandidateFilters, matchesCandidateFilters } from "@/lib/candidate-filters";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { inputClass, inputStyle } from "@/components/ui/Field";
import { CandidateFilterBar } from "@/components/empresa/CandidateFilterBar";
import { CandidateAvatar, CandidateCardBody, type CandidateLike } from "@/components/empresa/CandidateCardBody";
import { QRCodeView } from "@/components/qr/QRCodeView";
import { generateJobFlyerDataUrl } from "@/lib/job-flyer";
import { BoostJobButton } from "@/components/empresa/BoostJobButton";
import { ExtendJobButton } from "@/components/empresa/ExtendJobButton";
import { displayStatus, statusBadgeStyle, isExpired, type JobPostRawStatus } from "@/lib/job-post-status";
import { businessSlugFor } from "@/lib/slug";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

type Application = {
  id: string;
  status: string;
  created: string;
  candidate: string;
  score?: number;
  screening_answers?: ScreeningAnswer[];
  expand?: { candidate: CandidateLike };
};

type JobPost = {
  id: string;
  name: string;
  role: string;
  slug: string;
  short_code?: string;
  active: boolean;
  status?: JobPostRawStatus;
  expires_at: string;
  duration_days: string;
  featured_until?: string;
  share_counts?: { whatsapp?: number; x?: number; instagram?: number };
  screening_questions?: ScreeningQuestion[];
  expand?: { business?: { plan?: string; business_name?: string; logo?: string; collectionId?: string; id?: string } };
};

type HistoryEvent = {
  id: string;
  status: string;
  from_status: string | null;
  note: string | null;
  by: string | null;
  byMe: boolean;
  created: string;
};

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

const STATUS_ACTIONS: { status: string; label: string }[] = [
  { status: "contactado", label: "Contactar" },
  { status: "entrevista", label: "Entrevista" },
  { status: "contratado", label: "Contratado" },
  { status: "descartado", label: "Descartado" },
];

export function ApplicantsPanel({ jobPostId, readOnly }: { jobPostId: string; readOnly?: boolean }) {
  const [job, setJob] = useState<JobPost | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [filters, setFilters] = useState(emptyCandidateFilters);
  const [status, setStatus] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState<number | null>(null);
  // Nota interna en borrador por postulante (se adjunta al próximo cambio de
  // estado o se guarda sola) e historial cargado por postulante.
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, HistoryEvent[]>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  useEffect(() => {
    const client = pb();
    client
      .collection("job_posts")
      .getOne<JobPost>(jobPostId, { expand: "business" })
      .then((jobRecord) => {
        setJob(jobRecord);
        return client.collection("applications").getFullList<Application>({
          filter: `job_post="${jobPostId}"`,
          // Primero por score (mayor coincidencia con las preguntas filtro
          // arriba), después por fecha -- si la búsqueda no tiene preguntas
          // filtro, score es 0 para todos y esto se comporta igual que antes.
          sort: "-score,-created",
          expand: "candidate",
        });
      })
      .then((apps) => setApplications(apps))
      .catch(() => setNotFound(true));

    client
      .collection("favorites")
      .getList(1, 1, { filter: `job_post="${jobPostId}"`, requestKey: null })
      .then((res) => setFavoritesCount(res.totalItems))
      .catch(() => setFavoritesCount(null));
  }, [jobPostId]);

  async function loadHistory(applicationId: string) {
    try {
      const res = await fetch(`/api/applications/${applicationId}/status`, {
        headers: { Authorization: `Bearer ${pb().authStore.token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setHistory((prev) => ({ ...prev, [applicationId]: data.events ?? [] }));
    } catch {
      // el historial es informativo; si falla, no rompemos la pantalla
    }
  }

  function toggleExpand(applicationId: string) {
    const next = expandedId === applicationId ? null : applicationId;
    setExpandedId(next);
    if (next && !history[next]) loadHistory(next);
  }

  // Todo cambio de estado (y toda nota interna) pasa por el server: escribe el
  // evento de auditoría con quién/desde-qué-estado/nota, cosa que no se puede
  // hacer client-side (createRule de application_status_events cerrado).
  async function submitChange(applicationId: string, newStatus: string, note: string) {
    const res = await fetch(`/api/applications/${applicationId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pbToken: pb().authStore.token, status: newStatus, note }),
    });
    if (!res.ok) throw new Error("update-failed");
    setApplications(
      (prev) => prev?.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a)) ?? prev,
    );
    setNoteDrafts((prev) => ({ ...prev, [applicationId]: "" }));
    if (expandedId === applicationId) loadHistory(applicationId);
  }

  async function updateStatus(applicationId: string, newStatus: string) {
    setUpdatingId(applicationId);
    try {
      await submitChange(applicationId, newStatus, (noteDrafts[applicationId] ?? "").trim());
    } catch {
      // no cambiamos el estado local si falló
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveNoteOnly(applicationId: string, currentStatus: string) {
    const note = (noteDrafts[applicationId] ?? "").trim();
    if (!note) return;
    setSavingNoteId(applicationId);
    try {
      await submitChange(applicationId, currentStatus, note);
    } catch {
      // idem
    } finally {
      setSavingNoteId(null);
    }
  }

  async function toggleActive() {
    if (!job) return;
    const nextActive = !job.active;
    setTogglingActive(true);
    try {
      // `status` tiene que quedar en sync con `active` -- si no, esta acción
      // (la única forma de pausar/reactivar desde "Ver postulantes", aparte
      // del panel de búsquedas) deja el estado mostrado inconsistente con
      // el real (ej. "active" en status pero active=false).
      if (nextActive) {
        // Igual que "Reactivar" en el panel: si ya venció mientras estaba
        // pausada, le da otro período completo desde ahora en vez de
        // reactivarla ya vencida.
        const days = Number(job.duration_days) || 30;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        await pb().collection("job_posts").update(job.id, { active: true, status: "active", expires_at: expiresAt });
        setJob({ ...job, active: true, status: "active", expires_at: expiresAt });
      } else {
        await pb().collection("job_posts").update(job.id, { active: false, status: "paused" });
        setJob({ ...job, active: false, status: "paused" });
      }
    } finally {
      setTogglingActive(false);
    }
  }

  const filtered = useMemo(() => {
    if (!applications) return [];
    return applications.filter((app) => {
      const c = app.expand?.candidate;
      if (!c) return false;
      if (status && app.status !== status) return false;
      return matchesCandidateFilters(c, filters);
    });
  }, [applications, filters, status]);

  if (notFound) {
    return (
      <Card className="text-center">
        <h2 className="font-bold mb-2">No encontramos esta búsqueda</h2>
        <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
          Puede que no exista o no te pertenezca.
        </p>
      </Card>
    );
  }

  if (!job || !applications) {
    return (
      <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
        Cargando postulantes...
      </p>
    );
  }

  // Formato nuevo (negocio/código) cuando hay short_code -- todas las
  // búsquedas ya creadas lo tienen (migración con backfill), esto solo cae
  // al slug viejo como red de seguridad si por algo faltara.
  const publicUrl = job.short_code
    ? `${BASE_URL}/b/${businessSlugFor(job.expand?.business?.business_name ?? "")}/${job.short_code}`
    : `${BASE_URL}/b/${job.slug}`;
  const expired = isExpired(job.expires_at);
  const statusLabel = displayStatus(job);
  const plan = job.expand?.business?.plan ?? "free";
  // Vía el proxy same-origin (/api/business-logo/[id]), no la URL directa de
  // pb.tucv.ar -- esa no manda headers CORS y el <canvas> de la plantilla
  // imprimible no puede leerla sin eso.
  const businessLogo = job.expand?.business;
  const logoUrl = businessLogo?.logo && businessLogo.id ? `/api/business-logo/${businessLogo.id}` : null;
  // El plan gratis NO reactiva gratis una búsqueda vencida (para eso está
  // ExtendJobButton, pago) -- si no, el mismo toggle de acá le da otro
  // período de 7 días gratis las veces que quiera, y listo, el "1 búsqueda
  // por mes" del plan gratis no significa nada. OJO: una búsqueda recién
  // vencida sola (nunca pausada/cerrada a mano) sigue con active=true --
  // no filtrar por `!job.active` acá, alcanza con "venció Y es gratis".
  const freeExpired = expired && plan === "free";

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold">{job.name}</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-[var(--tucv-radius)]" style={statusBadgeStyle(statusLabel)}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            className="text-sm font-semibold"
            style={{ color: "var(--tucv-primary)" }}
          >
            {showQr ? "Ocultar QR / link" : "Ver QR / link"}
          </button>
          {!readOnly && !freeExpired && (
            <button
              type="button"
              onClick={toggleActive}
              disabled={togglingActive}
              className="text-sm font-semibold disabled:opacity-50"
              style={{ color: "var(--tucv-muted)" }}
            >
              {job.active ? "Pausar búsqueda" : "Reactivar búsqueda"}
            </button>
          )}
        </div>
      </div>

      {!readOnly && freeExpired && (
        <div
          className="mb-4 p-3 rounded-[var(--tucv-radius)] text-sm"
          style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}
        >
          <p className="font-semibold mb-2">
            Esta búsqueda venció. Sumale 15 días más sin perder el link ni el QR que ya compartiste.
          </p>
          <ExtendJobButton jobPostId={job.id} expiresAt={job.expires_at} />
        </div>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4 text-sm" style={{ color: "var(--tucv-muted)" }}>
        <span>
          {applications.length} postulante{applications.length === 1 ? "" : "s"} en total
        </span>
        {favoritesCount !== null && favoritesCount > 0 && (
          <span>
            {favoritesCount} persona{favoritesCount === 1 ? "" : "s"} la guardó{favoritesCount === 1 ? "" : "n"} como favorita
          </span>
        )}
        {job.share_counts && (job.share_counts.whatsapp || job.share_counts.x || job.share_counts.instagram) ? (
          <span>
            Compartida {(job.share_counts.whatsapp ?? 0) + (job.share_counts.x ?? 0) + (job.share_counts.instagram ?? 0)}{" "}
            {(job.share_counts.whatsapp ?? 0) + (job.share_counts.x ?? 0) + (job.share_counts.instagram ?? 0) === 1 ? "vez" : "veces"}{" "}
            (WhatsApp {job.share_counts.whatsapp ?? 0} · X {job.share_counts.x ?? 0} · Instagram{" "}
            {job.share_counts.instagram ?? 0})
          </span>
        ) : null}
      </div>

      {!readOnly && job.active && !expired && (
        <div className="mb-4">
          <BoostJobButton jobPostId={job.id} featuredUntil={job.featured_until} />
        </div>
      )}

      {showQr && (
        <Card className="mb-6">
          <div
            className="text-sm p-3 rounded-[var(--tucv-radius)] break-all mb-4"
            style={{ backgroundColor: "var(--tucv-bg)", border: "1px solid var(--tucv-border)" }}
          >
            {publicUrl}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <QRCodeView
              url={publicUrl}
              fileName={job.slug}
              renderFlyer={(qrDataUrl) =>
                generateJobFlyerDataUrl({
                  role: job.role,
                  businessName: job.expand?.business?.business_name ?? "",
                  qrDataUrl,
                  logoUrl,
                })
              }
            />
            <Button type="button" onClick={() => navigator.clipboard?.writeText(publicUrl)}>
              Copiar link
            </Button>
          </div>
        </Card>
      )}

      {applications.length === 0 ? (
        <Card className="text-center">
          <h2 className="font-bold mb-2">Todavía no tenés postulantes para esta búsqueda</h2>
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Compartí el link o el QR para que la gente se postule.
          </p>
        </Card>
      ) : (
        <>
          <CandidateFilterBar
            value={filters}
            onChange={setFilters}
            extra={
              <select
                className={inputClass}
                style={inputStyle}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Cualquier estado</option>
                {APPLICATION_STATUS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            }
          />

          {filtered.length === 0 ? (
            <Card className="text-center">
              <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
                Ningún postulante coincide con esos filtros.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((app) => {
                const c = app.expand!.candidate;
                const expanded = expandedId === app.id;

                return (
                  <Card key={app.id}>
                    <div className="flex gap-4">
                      <CandidateAvatar candidate={c} />
                      <div className="min-w-0 flex-1">
                        <CandidateCardBody
                          candidate={c}
                          expanded={expanded}
                          topRightBadge={
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {job.screening_questions && job.screening_questions.length > 0 && (
                                <span
                                  className="text-xs font-bold px-2 py-1 rounded-[var(--tucv-radius)]"
                                  style={{
                                    backgroundColor: "var(--tucv-accent)",
                                    color: "var(--tucv-text)",
                                    border: "1.5px solid var(--tucv-border)",
                                  }}
                                >
                                  {app.score ?? 0} pts
                                </span>
                              )}
                              <span
                                className="text-xs font-semibold px-2 py-1 rounded-[var(--tucv-radius)]"
                                style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-primary)" }}
                              >
                                {labelFor(APPLICATION_STATUS, app.status)}
                              </span>
                            </div>
                          }
                        />

                        {expanded && job.screening_questions && job.screening_questions.length > 0 && (
                          <div
                            className="mt-3 p-3 rounded-[var(--tucv-radius)] text-sm space-y-2"
                            style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tucv-muted)" }}>
                              Preguntas filtro
                            </p>
                            {job.screening_questions.map((q) => {
                              const answer = app.screening_answers?.find((a) => a.questionId === q.id);
                              return (
                                <div key={q.id}>
                                  <p className="font-medium">{q.question}</p>
                                  <p style={{ color: "var(--tucv-muted)" }}>
                                    {answer ? (answer.answer === "si" ? "Sí" : answer.answer === "no" ? "No" : answer.answer) : "Sin responder"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(app.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border"
                            style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
                          >
                            {expanded ? "Ocultar perfil" : "Ver perfil"}
                          </button>
                          <a
                            href={waLink(c.whatsapp ?? "", `Hola ${c.name}, te contacto por tu postulación en TuCV.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                            style={{ backgroundColor: "#128C4A", color: "#fff" }}
                          >
                            WhatsApp
                          </a>
                          {STATUS_ACTIONS.map((action) => {
                            const active = app.status === action.status;
                            // "Descartado" es una acción destructiva pero no es la
                            // acción primaria de esta pantalla (no hay paso de
                            // confirmación acá) -> nunca lleva el mismo peso sólido
                            // que Contactar/Entrevista/Contratado, ni siquiera
                            // activa (Refactoring UI, "Destructive actions").
                            if (action.status === "descartado") {
                              return (
                                <button
                                  key={action.status}
                                  type="button"
                                  disabled={updatingId === app.id}
                                  onClick={() => updateStatus(app.id, action.status)}
                                  className="text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
                                  style={{
                                    color: active ? "#B42318" : "var(--tucv-muted)",
                                    textDecoration: active ? "none" : "underline",
                                  }}
                                >
                                  {action.label}
                                </button>
                              );
                            }
                            return (
                              <Button
                                key={action.status}
                                type="button"
                                variant={active ? "primary" : "secondary"}
                                disabled={updatingId === app.id}
                                onClick={() => updateStatus(app.id, action.status)}
                                className="!px-3 !py-1.5 text-xs"
                              >
                                {action.label}
                              </Button>
                            );
                          })}
                        </div>

                        {expanded && (
                          <div
                            className="mt-4 p-3 rounded-[var(--tucv-radius)] space-y-4"
                            style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}
                          >
                            <div>
                              <label
                                className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                                style={{ color: "var(--tucv-muted)" }}
                              >
                                Nota interna
                              </label>
                              <textarea
                                value={noteDrafts[app.id] ?? ""}
                                onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [app.id]: e.target.value }))}
                                placeholder="Queda para tu equipo, no la ve el postulante."
                                rows={2}
                                className={inputClass}
                                style={inputStyle}
                              />
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => saveNoteOnly(app.id, app.status)}
                                  disabled={savingNoteId === app.id || !(noteDrafts[app.id] ?? "").trim()}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border disabled:opacity-50"
                                  style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
                                >
                                  {savingNoteId === app.id ? "Guardando..." : "Guardar nota"}
                                </button>
                                <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
                                  También se adjunta si cambiás el estado.
                                </span>
                              </div>
                            </div>

                            {history[app.id] && history[app.id].length > 0 && (
                              <div>
                                <p
                                  className="text-xs font-semibold uppercase tracking-wide mb-2"
                                  style={{ color: "var(--tucv-muted)" }}
                                >
                                  Historial
                                </p>
                                <ul className="space-y-2">
                                  {history[app.id].map((ev) => (
                                    <li key={ev.id} className="text-sm">
                                      <div className="flex flex-wrap items-baseline gap-x-2">
                                        <span className="font-semibold">
                                          {ev.from_status ? `${labelFor(APPLICATION_STATUS, ev.from_status)} → ` : ""}
                                          {labelFor(APPLICATION_STATUS, ev.status)}
                                        </span>
                                        <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
                                          {ev.byMe ? "vos" : ev.by} · {formatEventDate(ev.created)}
                                        </span>
                                      </div>
                                      {ev.note && (
                                        <p className="text-sm mt-0.5" style={{ color: "var(--tucv-muted)" }}>
                                          “{ev.note}”
                                        </p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
