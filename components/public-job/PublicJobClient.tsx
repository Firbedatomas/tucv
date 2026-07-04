"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { pb } from "@/lib/pocketbase";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import { trackEvent } from "@/lib/track";
import {
  CATEGORIES,
  EXPERIENCE,
  AVAILABILITY,
  JOB_PERKS,
  VACANCIES,
  HARD_REQUIREMENTS,
  taskSuggestionsFor,
  computeScreeningScore,
  labelFor,
  labelsFor,
} from "@/lib/constants";
import type { PublicJob } from "@/lib/public-job";
import { Card } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { inputClass, inputStyle } from "@/components/ui/Field";
import { salaryText } from "@/lib/job-display";
import { timeAgo } from "@/lib/time-ago";
import { RelatedJobs } from "@/components/public-job/RelatedJobs";
import { LocationMap } from "@/components/public-job/LocationMap";
import { instagramUrl, websiteUrl, websiteLabel } from "@/lib/social-links";
import { FavoriteButton } from "@/components/public-job/FavoriteButton";
import { ShareButtons } from "@/components/public-job/ShareButtons";
import { ReportBusinessButton } from "@/components/public-job/ReportBusinessButton";
import { sanitizeVisibleMessage } from "@/lib/sanitize-html";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

type OwnCandidate = { id: string; name: string };

// Distingue por qué no está disponible: el negocio la cerró a mano vs. se
// venció sola con el tiempo -- antes de raw_active no se podía saber, todo
// se veía como "cerrada".
function unavailableReason(job: PublicJob): { title: string; detail: string } {
  const expired = new Date(job.expires_at).getTime() < Date.now();
  if (job.raw_active && expired) {
    return {
      title: "Esta búsqueda ya venció",
      detail: `Pasó el tiempo que ${job.business_name} tenía planeado para recibir postulantes.`,
    };
  }
  return {
    title: "Esta búsqueda ya está cerrada",
    detail: `${job.business_name} la cerró -- puede que ya haya cubierto el puesto.`,
  };
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-[var(--tucv-radius)]"
      style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" }}
    >
      <span className="font-semibold" style={{ color: "var(--tucv-muted)" }}>
        {label}:
      </span>
      {children}
    </span>
  );
}

function PostedAgoText({ created }: { created: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setText(timeAgo(created, Date.now())), 0);
    return () => clearTimeout(id);
  }, [created]);
  if (!text) return null;
  return <>· {text}</>;
}

// A diferencia de PostedAgoText, esto no depende de "ahora" (solo formatea
// una fecha fija) -- no hace falta el truco de esperar al montaje en el
// cliente para evitar el mismatch de hidratación.
function MemberSinceText({ created }: { created: string }) {
  const label = new Date(created).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return <>En TuCV desde {label}</>;
}

// El fetch inicial ya lo hizo el Server Component (page.tsx) -- lo necesita
// para generateMetadata/JSON-LD de cualquier forma, así que se lo pasamos
// como prop en vez de pedirlo de nuevo acá. Si viniera null (no debería,
// page.tsx ya devuelve 404 antes de renderizar esto) lo volvemos a pedir
// como red de seguridad.
// `publicPath` es todo lo que va después de "/b/" en la URL -- un solo
// segmento para links viejos (app/b/[slug]/page.tsx, formato heredado) o
// "negocio/código" para los nuevos (app/b/[slug]/[code]/page.tsx).
// Server Components arman el que corresponda; acá solo se usa para
// reconstruir links de "volver a esta página" (compartir, login), nunca
// para buscar el job (eso ya lo resolvió el Server Component).
export function PublicJobClient({ publicPath, initialJob }: { publicPath: string; initialJob: PublicJob }) {
  const { isAuthenticated, userId } = usePostulanteAuth({ redirectIfLoggedOut: false, requireRole: false });
  const [candidate, setCandidate] = useState<OwnCandidate | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<
    { status: "ready"; job: PublicJob; applied: boolean; applying: boolean; error?: string }
  >({ status: "ready", job: initialJob, applied: false, applying: false });

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!isAuthenticated || !userId) throw new Error("no-session");
        return pb()
          .collection("candidate_profiles")
          .getFirstListItem(`user="${userId}"`, { requestKey: null });
      })
      .then((record) => {
        if (!cancelled) setCandidate({ id: record.id, name: record.name as string });
      })
      .catch(() => {
        if (!cancelled) setCandidate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  // Si ya se postuló antes a esta búsqueda, el botón de aplicar no debe
  // reaparecer al recargar la página -- antes "applied" era solo estado de
  // React (se perdía en cada carga), así que chequeamos contra el server.
  useEffect(() => {
    if (!candidate) return;
    let cancelled = false;
    pb()
      .collection("applications")
      .getFirstListItem(`job_post="${state.job.id}" && candidate="${candidate.id}"`, { requestKey: null })
      .then(() => {
        if (!cancelled) setState((s) => ({ ...s, applied: true }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [candidate, state.job.id]);

  const questions = state.job.screening_questions ?? [];
  const pendingSiNo = questions.some((q) => q.type === "si_no" && !answers[q.id]);

  async function apply() {
    if (!candidate) return;
    setState((s) => ({ ...s, applying: true, error: undefined }));
    try {
      const screeningAnswers = questions
        .filter((q) => answers[q.id]?.trim())
        .map((q) => ({ questionId: q.id, answer: answers[q.id].trim() }));
      const score = computeScreeningScore(questions, screeningAnswers);
      await pb().collection("applications").create({
        job_post: state.job.id,
        candidate: candidate.id,
        status: "nuevo",
        screening_answers: screeningAnswers,
        score,
      });
      trackEvent("Postulante: postulacion enviada");
      setState((s) => ({ ...s, applying: false, applied: true }));
    } catch {
      setState((s) => ({
        ...s,
        applying: false,
        error: "No pudimos enviar tu postulación. Puede que ya te hayas postulado.",
      }));
    }
  }

  const { job } = state;
  const reason = job.active ? null : unavailableReason(job);

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">
      <div className="max-w-lg mx-auto lg:max-w-none lg:mx-0 lg:col-span-2">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {job.business_logo_url ? (
              <Image
                src={job.business_logo_url}
                alt={job.business_name}
                width={40}
                height={40}
                unoptimized
                className="w-10 h-10 rounded-[var(--tucv-radius)] object-cover shrink-0"
                style={{ border: "2px solid var(--tucv-border)" }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-[var(--tucv-radius)] flex items-center justify-center font-bold text-sm shrink-0"
                style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-primary)", border: "2px solid var(--tucv-border)" }}
              >
                {job.business_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{job.business_name}</p>
              <p className="text-xs truncate" style={{ color: "var(--tucv-muted)" }}>
                {job.category === "otro" && job.category_other ? job.category_other : labelFor(CATEGORIES, job.category)}{" "}
                <PostedAgoText created={job.created} />
              </p>
            </div>
          </div>
          <span
            className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-[var(--tucv-radius)] shrink-0"
            style={
              job.active
                ? { backgroundColor: "#DCFCE7", color: "#128C4A", border: "2px solid #128C4A" }
                : { backgroundColor: "var(--tucv-bg)", color: "var(--tucv-muted)", border: "2px solid var(--tucv-border)" }
            }
          >
            {job.active ? "Activa" : reason?.title.includes("venció") ? "Vencida" : "Cerrada"}
          </span>
        </div>

        {job.business_bio && (
          <p className="text-sm mb-3" style={{ color: "var(--tucv-text)" }}>
            {job.business_bio}
          </p>
        )}

        {job.business_created && (
          <p className="text-xs mb-3" style={{ color: "var(--tucv-muted)" }}>
            <MemberSinceText created={job.business_created} />
          </p>
        )}

        {(websiteUrl(job.business_website) || instagramUrl(job.business_instagram)) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {websiteUrl(job.business_website) && (
              <a
                href={websiteUrl(job.business_website) as string}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-xs font-semibold px-2.5 py-1 rounded-[var(--tucv-radius)] hover:opacity-70 transition"
                style={{ border: "2px solid var(--tucv-border)", color: "var(--tucv-text)" }}
              >
                {websiteLabel(job.business_website)}
              </a>
            )}
            {instagramUrl(job.business_instagram) && (
              <a
                href={instagramUrl(job.business_instagram) as string}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-xs font-semibold px-2.5 py-1 rounded-[var(--tucv-radius)] hover:opacity-70 transition"
                style={{ border: "2px solid var(--tucv-border)", color: "var(--tucv-text)" }}
              >
                Instagram
              </a>
            )}
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-bold mb-3">{job.role || job.name}</h1>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {candidate && <FavoriteButton jobPostId={job.id} candidateId={candidate.id} />}
          <ShareButtons jobId={job.id} url={`${BASE_URL}/b/${publicPath}`} title={`${job.role || job.name} en ${job.business_name}`} />
        </div>

        {!job.active && reason ? (
          <Card className="text-center">
            <h2 className="font-bold mb-2">{reason.title}</h2>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              {reason.detail}
            </p>
          </Card>
        ) : (
          <Card>
            <div className="flex flex-wrap gap-2 mb-5">
              {salaryText(job) && (
                <span
                  className="inline-flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                  style={{ backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)", border: "2px solid var(--tucv-border)" }}
                >
                  {salaryText(job)}
                </span>
              )}
              <ChipRow label="Zona">{job.address_zone}</ChipRow>
              <ChipRow label="Turno">{labelsFor(AVAILABILITY, job.shift).join(", ")}</ChipRow>
              <ChipRow label="Experiencia">{labelFor(EXPERIENCE, job.experience_required)}</ChipRow>
              {job.schedule_details && <ChipRow label="Horario">{job.schedule_details}</ChipRow>}
              {job.vacancies && <ChipRow label="Vacantes">{labelFor(VACANCIES, job.vacancies)}</ChipRow>}
            </div>

            {job.visible_message && (
              <div
                className="text-sm mb-5 p-3 rounded-[var(--tucv-radius)]"
                style={{ backgroundColor: "var(--tucv-bg)" }}
                // Re-sanitizamos acá también (defensa en profundidad): nunca
                // confiamos en que lo guardado ya esté limpio, sin importar
                // por dónde haya entrado.
                dangerouslySetInnerHTML={{ __html: sanitizeVisibleMessage(job.visible_message) }}
              />
            )}

            {job.main_tasks?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--tucv-muted)" }}>
                  Tareas principales
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {job.main_tasks.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-1 rounded-[var(--tucv-radius)]"
                      style={{
                        backgroundColor: "var(--tucv-bg)",
                        color: "var(--tucv-text)",
                        border: "2px solid var(--tucv-border)",
                      }}
                    >
                      {labelFor(taskSuggestionsFor(job.category), t)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.perks?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--tucv-muted)" }}>
                  Beneficios
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {job.perks.map((p) => (
                    <span
                      key={p}
                      className="text-xs px-2 py-1 rounded-[var(--tucv-radius)]"
                      style={{
                        backgroundColor: "var(--tucv-bg)",
                        color: "var(--tucv-text)",
                        border: "2px solid var(--tucv-border)",
                      }}
                    >
                      {labelFor(JOB_PERKS, p)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.hard_requirements?.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--tucv-muted)" }}>
                  Requisitos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {job.hard_requirements.map((r) => (
                    <span
                      key={r}
                      className="text-xs px-2 py-1 rounded-[var(--tucv-radius)]"
                      style={{
                        backgroundColor: "var(--tucv-accent)",
                        color: "var(--tucv-text)",
                        border: "2px solid var(--tucv-border)",
                      }}
                    >
                      {labelFor(HARD_REQUIREMENTS, r)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {state.applied ? (
              <p className="text-sm font-semibold" style={{ color: "var(--tucv-primary)" }}>
                ¡Listo, te postulaste! {job.business_name} va a poder ver tu perfil.
              </p>
            ) : candidate ? (
              <>
                {questions.length > 0 && (
                  <div className="mb-4 space-y-3">
                    {questions.map((q) => (
                      <div key={q.id}>
                        <p className="text-sm font-medium mb-1.5">{q.question}</p>
                        {q.type === "si_no" ? (
                          <div className="flex gap-2">
                            {[
                              { value: "si", label: "Sí" },
                              { value: "no", label: "No" },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                                className="text-sm px-4 py-1.5 rounded-[var(--tucv-radius)] border-2"
                                style={
                                  answers[q.id] === opt.value
                                    ? { backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)", borderColor: "var(--tucv-border)" }
                                    : { backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)", borderColor: "var(--tucv-border)" }
                                }
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            className={inputClass}
                            style={inputStyle}
                            value={answers[q.id] ?? ""}
                            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" onClick={apply} disabled={state.applying || pendingSiNo} className="w-full">
                  {state.applying ? "Enviando..." : `Postularme como ${candidate.name}`}
                </Button>
                {pendingSiNo && (
                  <p className="text-xs mt-2" style={{ color: "var(--tucv-muted)" }}>
                    Respondé las preguntas de arriba para postularte.
                  </p>
                )}
                {state.error && (
                  <p className="text-sm mt-2 font-medium" style={{ color: "#DC2626" }}>
                    {state.error}
                  </p>
                )}
              </>
            ) : isAuthenticated ? (
              <LinkButton href={`/postulante/nuevo?applyTo=${job.id}`} className="w-full">
                Crear mi perfil y postularme
              </LinkButton>
            ) : (
              <LinkButton href={`/postulante/login?next=/b/${publicPath}`} className="w-full">
                Ingresar con Google para postularme
              </LinkButton>
            )}
          </Card>
        )}

        <div className="mt-4 text-center lg:text-left">
          <ReportBusinessButton jobPostId={job.id} publicPath={publicPath} />
        </div>
      </div>

      <div className="max-w-lg mx-auto lg:max-w-none lg:mx-0 mt-8 lg:mt-0 space-y-6">
        <LocationMap addressZone={job.address_zone} />
        <RelatedJobs currentJobId={job.id} category={job.category} addressZone={job.address_zone} />
      </div>
      </div>
    </main>
  );
}
