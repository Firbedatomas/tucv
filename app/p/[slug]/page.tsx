"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { CATEGORIES, AVAILABILITY, EXPERIENCE, STUDY_LEVELS, STUDY_STATUS, labelFor, labelsFor } from "@/lib/constants";
import { calculateAge } from "@/lib/age";
import { waLink } from "@/lib/whatsapp";
import { formatThousands } from "@/lib/format";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import { trackEvent } from "@/lib/track";
import { generateCandidateFlyerDataUrl } from "@/lib/candidate-flyer";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { QRCodeView } from "@/components/qr/QRCodeView";
import { ProfileShareButtons } from "@/components/postulantes/ProfileShareButtons";

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
  birth_date: string;
  age_manual: number | null;
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
  const age = calculateAge(profile.birth_date, profile.age_manual);
  const expByCategory = Object.fromEntries((profile.category_experience ?? []).map((e) => [e.category, e]));
  const isOwnProfile = Boolean(ownProfile) && ownProfile?.id === profile.id;
  const profileUrl = `${typeof window !== "undefined" ? window.location.origin : "https://tucv.ar"}/p/${slug}`;

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        {isOwnProfile && (
          <>
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
              />
              <div className="mt-4">
                <QRCodeView
                  url={profileUrl}
                  fileName={slug}
                  flyerButtonLabel="Descargar cartel para imprimir"
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
                  {exp && exp.experience !== "sin_experiencia" && (
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
                  {exp && exp.experience === "sin_experiencia" && (
                    <span style={{ color: "var(--tucv-muted)" }}> · sin experiencia todavía</span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
            Disponibilidad
          </p>
          <p className={profile.has_own_transport === "si" || profile.immediate_availability ? "text-sm mb-2" : "text-sm mb-5"}>
            {labelsFor(AVAILABILITY, profile.availability).join(", ")}
          </p>

          {(profile.has_own_transport === "si" || profile.immediate_availability) && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {profile.has_own_transport === "si" && (
                <span
                  className="text-xs px-2 py-0.5 rounded-[var(--tucv-radius)]"
                  style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)" }}
                >
                  Con movilidad propia
                </span>
              )}
              {profile.immediate_availability && (
                <span
                  className="text-xs px-2 py-0.5 rounded-[var(--tucv-radius)]"
                  style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)" }}
                >
                  Puede empezar ya
                </span>
              )}
            </div>
          )}

          {profile.expected_salary && (
            <p className="text-sm mb-5">
              <span className="font-semibold">Sueldo pretendido:</span> {formatThousands(profile.expected_salary)}
            </p>
          )}

          {profile.studies?.length > 0 && (
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
          )}

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

        <p className="text-center text-xs mt-4" style={{ color: "var(--tucv-muted)" }}>
          Perfil creado en TuCV — perfil laboral simple para trabajos de cercanía.
        </p>
      </div>
    </main>
  );
}
