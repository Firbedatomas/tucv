"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { CATEGORIES, AVAILABILITY, EXPERIENCE, STUDY_LEVELS, STUDY_STATUS, labelFor, labelsFor } from "@/lib/constants";
import { waLink } from "@/lib/whatsapp";
import { formatThousands } from "@/lib/format";
import { experienceYearsLabel, periodLabel, categoryLabel } from "@/lib/experience-display";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import { trackEvent } from "@/lib/track";
import { emitActivity } from "@/lib/emit-activity";
import { generateCandidateFlyerDataUrl } from "@/lib/candidate-flyer";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { QRCodeView } from "@/components/qr/QRCodeView";
import { ProfileShareButtons } from "@/components/postulantes/ProfileShareButtons";
import { ProfileBadges } from "@/components/postulantes/ProfileBadges";
import { ReferencesManager } from "@/components/postulantes/ReferencesManager";
import { ReferencesSummary } from "@/components/postulantes/ReferencesSummary";
import { RecommendationsManager } from "@/components/postulantes/RecommendationsManager";
import { RecommendationsSummary } from "@/components/postulantes/RecommendationsSummary";
import { RecommendButton } from "@/components/postulantes/RecommendButton";
import { VisibilityChecklist } from "@/components/postulantes/VisibilityChecklist";

type RichCategoryExperience = {
  category: string;
  experience: string;
  company?: string;
  company_id?: string;
  company_address?: string;
  start_year?: number | null;
  end_year?: number | null;
  is_current?: boolean;
};

type RichStudy = { level: string; status?: string; institution?: string };
type RichReference = { name: string; relation: string; phone: string };

function formatStudy(entry: RichStudy | string): string {
  if (typeof entry === "string") return entry;
  const parts = [labelFor(STUDY_LEVELS, entry.level)];
  if (entry.status) parts.push(labelFor(STUDY_STATUS, entry.status).toLowerCase());
  const label = parts.join(" ");
  return entry.institution ? `${label} — ${entry.institution}` : label;
}

function formatReference(entry: RichReference | string): string {
  if (typeof entry === "string") return entry;
  return [entry.name, entry.relation, entry.phone].filter(Boolean).join(" · ");
}

type PublicProfile = {
  id: string;
  name: string;
  city_zone: string;
  age: number | null;
  whatsapp: string;
  categories: string[];
  category_other: string;
  category_experience: RichCategoryExperience[];
  availability: string[];
  studies: (RichStudy | string)[];
  references: (RichReference | string)[];
  bio: string;
  has_own_transport: string;
  immediate_availability: boolean;
  expected_salary: string;
  photoUrl: string | null;
  cvUrl: string | null;
  // Modelo relacional (Fase 3B). Opcionales: si vacíos, la UI cae al fallback
  // viejo (category_experience/studies).
  work_experiences?: PublicWorkExp[];
  education?: PublicEducation[];
  total_experience_months?: number;
  work_experience_count?: number;
  dominant_categories?: string[];
  latest_job_title?: string;
  has_current_job?: boolean;
};

type PublicWorkExp = {
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
  tasks: string[];
};

type PublicEducation = {
  title: string;
  kind: string;
  institution: string;
  level: string;
  status: string;
  start_year: number | null;
  end_year: number | null;
};

export default function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { profile: ownProfile } = usePostulanteAuth({ redirectIfLoggedOut: false });
  const [state, setState] = useState<
    { status: "loading" } | { status: "not-found" } | { status: "ready"; profile: PublicProfile }
  >({ status: "loading" });

  useEffect(() => {
    fetch(`/api/public-profile/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((profile: PublicProfile) => setState({ status: "ready", profile }))
      .catch(() => setState({ status: "not-found" }));
  }, [slug]);

  // Cuenta la visita para el digest semanal (lib/email/templates/
  // candidate-weekly-profile-views.ts) -- nunca cuando el dueño mira su
  // propio perfil, si no cada vez que entra a revisar cómo se ve le suma
  // una visita "de él mismo".
  useEffect(() => {
    if (state.status !== "ready") return;
    if (ownProfile?.id === state.profile.id) return;
    trackEvent("Postulante: perfil visto");
    fetch("/api/profile-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }, [state, ownProfile, slug]);

  if (state.status === "loading") {
    return (
      <main className="flex-1 px-4 py-14 text-center">
        <p style={{ color: "var(--tucv-muted)" }}>Buscando el perfil...</p>
      </main>
    );
  }

  if (state.status === "not-found") {
    return (
      <main className="flex-1 px-4 py-14">
        <div className="max-w-lg mx-auto">
          <Card className="text-center">
            <h1 className="font-bold text-xl mb-2">No encontramos este perfil</h1>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              El link puede estar mal escrito o el perfil ya no existe.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  const { profile } = state;
  const age = profile.age;
  const expByCategory = Object.fromEntries((profile.category_experience ?? []).map((e) => [e.category, e]));
  // Fase 3B: si hay experiencias relacionales, mostramos la sección nueva
  // "Experiencia laboral" y dejamos "Rubros" solo con los rubros (sin el detalle
  // viejo inline, para no duplicar). Si no hay, cae al display viejo (fallback).
  const workExps = profile.work_experiences ?? [];
  const hasNewExp = workExps.length > 0;
  const education = profile.education ?? [];
  const isOwnProfile = Boolean(ownProfile) && ownProfile?.id === profile.id;
  const profileUrl = `${typeof window !== "undefined" ? window.location.origin : "https://tucv.ar"}/p/${slug}`;

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        {isOwnProfile && (
          <>
            <VisibilityChecklist
              slug={slug}
              categories={profile.categories}
              availability={profile.availability}
              bio={profile.bio}
              has_own_transport={profile.has_own_transport}
              immediate_availability={profile.immediate_availability}
              category_experience={profile.category_experience}
            />
            <div
              className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 rounded-[var(--tucv-radius)]"
              style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}
            >
              <p className="text-sm font-semibold">Así te ven los negocios a los que te postulás.</p>
              <LinkButton href="/postulante/editar" variant="secondary">
                Editar mi perfil
              </LinkButton>
            </div>
            <Card className="mb-4">
              <p className="text-sm font-semibold mb-3">Compartí tu perfil</p>
              <ProfileShareButtons
                url={profileUrl}
                text={`Estoy buscando laburo${profile.city_zone ? ` en ${profile.city_zone}` : ""}. Mi perfil: ${profileUrl}`}
                entityType="profile"
                entityId={profile.id}
              />
              <div className="mt-4">
                <QRCodeView
                  url={profileUrl}
                  fileName={slug}
                  flyerButtonLabel="Descargar cartel para imprimir"
                  onDownloadQr={() => emitActivity("profile_qr_downloaded", { candidateId: profile.id })}
                  onDownloadPoster={() => emitActivity("profile_poster_downloaded", { candidateId: profile.id })}
                  renderFlyer={(qrDataUrl) =>
                    generateCandidateFlyerDataUrl({
                      displayName: profile.name,
                      category: profile.categories[0] ? labelFor(CATEGORIES, profile.categories[0]) : "",
                      cityZone: profile.city_zone,
                      qrDataUrl,
                    })
                  }
                />
              </div>
            </Card>
            <ReferencesManager />
            <RecommendationsManager />
          </>
        )}
        <Card>
          <div className="flex items-center gap-4 mb-5">
            {profile.photoUrl ? (
              <Image
                src={profile.photoUrl}
                alt={profile.name}
                width={72}
                height={72}
                unoptimized
                className="w-[72px] h-[72px] rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shrink-0"
                style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-primary)" }}
              >
                {profile.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold">
                {profile.name}
                {age ? ` · ${age} años` : ""}
              </h1>
              <p className="text-sm truncate" style={{ color: "var(--tucv-muted)" }}>
                {profile.city_zone}
              </p>
            </div>
          </div>

          <ProfileBadges
            className="mb-5"
            candidate={{
              categories: profile.categories,
              // El perfil rico guarda experiencia por rubro (category_experience),
              // no un campo `experience` plano -- lo derivamos: alcanza con que
              // CUALQUIER rubro tenga experiencia cargada (distinta de "sin
              // experiencia") para el badge "Con experiencia".
              experience: (profile.category_experience ?? []).some(
                (e) => e.experience && e.experience !== "sin_experiencia",
              )
                ? "si"
                : "sin_experiencia",
              availability: profile.availability,
              bio: profile.bio,
              has_own_transport: profile.has_own_transport,
              immediate_availability: profile.immediate_availability,
            }}
          />

          {profile.bio && (
            <p className="text-sm mb-5" style={{ color: "var(--tucv-text)" }}>
              {profile.bio}
            </p>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
            Rubros y experiencia
          </p>
          <div className="space-y-2 mb-5">
            {profile.categories.map((c) => {
              const label = c === "otro" ? profile.category_other || "Otro" : labelFor(CATEGORIES, c);
              const exp = expByCategory[c];
              return (
                <div key={c} className="text-sm">
                  <span className="font-semibold">{label}</span>
                  {!hasNewExp && exp && exp.experience !== "sin_experiencia" && (
                    <span style={{ color: "var(--tucv-muted)" }}>
                      {" "}
                      · {labelFor(EXPERIENCE, exp.experience)}
                      {exp.company ? ` en ${exp.company}` : ""}
                      {exp.start_year ? ` (${exp.start_year}–${exp.is_current ? "actualidad" : exp.end_year ?? ""})` : ""}
                      {exp.company_id && (
                        <span style={{ color: "#128C4A" }} title="Empresa verificada en TuCV">
                          {" "}
                          ✓
                        </span>
                      )}
                    </span>
                  )}
                  {!hasNewExp && exp && exp.experience === "sin_experiencia" && (
                    <span style={{ color: "var(--tucv-muted)" }}> · sin experiencia todavía</span>
                  )}
                </div>
              );
            })}
          </div>

          {hasNewExp && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
                Experiencia laboral
              </p>
              {(() => {
                const yrs = experienceYearsLabel(profile.total_experience_months);
                const count = profile.work_experience_count ?? workExps.length;
                const parts: string[] = [];
                if (yrs) parts.push(yrs);
                if (count > 0) parts.push(`${count} ${count === 1 ? "experiencia" : "experiencias"}`);
                return parts.length ? <p className="text-sm font-semibold mb-3">{parts.join(" · ")}</p> : null;
              })()}
              <div className="space-y-3">
                {workExps.map((e, i) => (
                  <div
                    key={i}
                    className="rounded-[var(--tucv-radius)] p-3"
                    style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}
                  >
                    <p className="font-bold break-words">{e.job_title || categoryLabel(e.category) || "Experiencia"}</p>
                    <p className="text-sm break-words" style={{ color: "var(--tucv-muted)" }}>
                      {[e.company_name, categoryLabel(e.category)].filter(Boolean).join(" · ")}
                    </p>
                    {periodLabel(e) && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--tucv-muted)" }}>
                        {periodLabel(e)}
                      </p>
                    )}
                    {e.tasks.length > 0 && (
                      <p className="text-sm mt-1.5 break-words">
                        <span style={{ color: "var(--tucv-muted)" }}>Tareas: </span>
                        {e.tasks.join(", ")}
                      </p>
                    )}
                    {e.description && (
                      <p className="text-sm mt-1 break-words" style={{ color: "var(--tucv-text)" }}>
                        {e.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
            Disponibilidad
          </p>
          {/* "Puede empezar ya" y "Movilidad propia" ya se muestran como
              badges arriba (ProfileBadges) -- acá va solo el detalle de
              turnos, sin repetir esos dos. */}
          <p className="text-sm mb-5">{labelsFor(AVAILABILITY, profile.availability).join(", ")}</p>

          {profile.expected_salary && (
            <p className="text-sm mb-5">
              <span className="font-semibold">Sueldo pretendido:</span> {formatThousands(profile.expected_salary)}
            </p>
          )}

          {/* Estudios: relacional (candidate_education) si hay; si no, fallback al
              JSON viejo `studies`; si tampoco, no se muestra el bloque. */}
          {education.length > 0 ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
                Estudios
              </p>
              <div className="space-y-2 mb-5">
                {education.map((s, i) => {
                  const statusLbl =
                    s.status === "en_curso" ? "en curso" : s.status === "abandonado" ? "abandonado" : s.status === "completo" ? "completo" : "";
                  const meta = [s.institution, statusLbl].filter(Boolean).join(" · ");
                  return (
                    <div key={i} className="text-sm break-words">
                      <span className="font-semibold">{s.title}</span>
                      {meta && <span style={{ color: "var(--tucv-muted)" }}> — {meta}</span>}
                    </div>
                  );
                })}
              </div>
            </>
          ) : profile.studies?.length > 0 ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
                Estudios
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {profile.studies.map((s, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-[var(--tucv-radius)]"
                    style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }}
                  >
                    {formatStudy(s)}
                  </span>
                ))}
              </div>
            </>
          ) : null}

          {profile.references?.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
                Referencias
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {profile.references.map((r, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-[var(--tucv-radius)]"
                    style={{ border: "1.5px solid var(--tucv-border)", color: "var(--tucv-text)" }}
                  >
                    {formatReference(r)}
                  </span>
                ))}
              </div>
            </>
          )}

          <ReferencesSummary slug={slug} />
          <RecommendationsSummary slug={slug} />
          <RecommendButton candidateId={profile.id} isOwnProfile={isOwnProfile} />

          <div className="flex flex-wrap gap-3 mt-2">
            <a
              href={waLink(profile.whatsapp, `Hola ${profile.name}, te contacto por tu perfil en TuCV.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold px-5 py-3 rounded-[var(--tucv-radius)]"
              style={{ backgroundColor: "#128C4A", color: "#fff" }}
            >
              Contactar por WhatsApp
            </a>
            {profile.cvUrl && (
              <a
                href={profile.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold px-5 py-3 rounded-[var(--tucv-radius)] border"
                style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
              >
                Ver CV adjunto
              </a>
            )}
          </div>
        </Card>

        {!isOwnProfile &&
          (() => {
            const firstName = profile.name.split(" ")[0] || profile.name;
            const zonePart = profile.city_zone ? ` en ${profile.city_zone}` : "";
            const helpPresets = [
              {
                label: "A un amigo",
                msg: `Che, ${firstName} está buscando laburo${zonePart}. Si sabés de algo o conocés a alguien que busca gente, pasale su perfil: ${profileUrl}`,
              },
              {
                label: "A un familiar",
                msg: `Hola, ${firstName} armó su perfil para conseguir trabajo${zonePart}. ¿Lo compartís por si alguien necesita? ${profileUrl}`,
              },
              {
                label: "A un grupo del barrio",
                msg: `Vecinos, ${firstName} está buscando trabajo${zonePart}. Si alguien necesita gente, este es su perfil: ${profileUrl}`,
              },
            ];
            return (
              <div
                className="mt-4 rounded-[var(--tucv-radius)] p-5 sm:p-6"
                style={{
                  backgroundColor: "var(--tucv-accent)",
                  border: "2px solid var(--tucv-border)",
                  boxShadow: "var(--tucv-shadow)",
                }}
              >
                <h2 className="font-bold text-lg mb-1">Ayudá a {firstName} a conseguir laburo</h2>
                <p className="text-sm mb-3" style={{ color: "var(--tucv-text)" }}>
                  Un minuto tuyo puede ser su próximo trabajo. Compartí su perfil con quien pueda
                  estar buscando gente.
                </p>
                <ProfileShareButtons
                  url={profileUrl}
                  text={`${firstName} está buscando laburo${zonePart}. Mirá su perfil en TuCV: ${profileUrl}`}
                  entityType="profile"
                  entityId={profile.id}
                  onShare={() => emitActivity("profile_shared", { candidateId: profile.id })}
                />

                <p className="text-sm font-semibold mt-4 mb-2">Pedí que otros lo compartan</p>
                <div className="flex flex-wrap gap-2">
                  {helpPresets.map((p) => (
                    <a
                      key={p.label}
                      href={`https://wa.me/?text=${encodeURIComponent(p.msg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        trackEvent("Postulante: pedido de compartir", { preset: p.label });
                        emitActivity("help_request_shared", { candidateId: profile.id });
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                      style={{ backgroundColor: "var(--tucv-text)", color: "var(--tucv-bg)" }}
                    >
                      {p.label}
                    </a>
                  ))}
                </div>

                <div className="mt-4">
                  <QRCodeView
                    url={profileUrl}
                    fileName={slug}
                    flyerButtonLabel="Descargar cartel para pegar"
                    onDownloadQr={() => emitActivity("profile_qr_downloaded", { candidateId: profile.id })}
                    onDownloadPoster={() => emitActivity("profile_poster_downloaded", { candidateId: profile.id })}
                    renderFlyer={(qrDataUrl) =>
                      generateCandidateFlyerDataUrl({
                        displayName: profile.name,
                        category: profile.categories[0] ? labelFor(CATEGORIES, profile.categories[0]) : "",
                        cityZone: profile.city_zone,
                        qrDataUrl,
                      })
                    }
                  />
                </div>
              </div>
            );
          })()}

        <p className="text-center text-xs mt-4" style={{ color: "var(--tucv-muted)" }}>
          Perfil creado en TuCV — perfil laboral simple para trabajos de cercanía.
        </p>
      </div>
    </main>
  );
}
