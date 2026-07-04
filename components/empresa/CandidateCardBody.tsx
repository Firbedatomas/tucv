"use client";

import { useState } from "react";
import Image from "next/image";
import { pb } from "@/lib/pocketbase";
import { CATEGORIES, EXPERIENCE, AVAILABILITY, STUDY_LEVELS, STUDY_STATUS, labelFor, labelsFor } from "@/lib/constants";
import { calculateAge } from "@/lib/age";
import { formatThousands } from "@/lib/format";
import { computeCandidateBadges, BADGE_TONE_STYLE } from "@/lib/candidate-badges";
import { timeAgo } from "@/lib/time-ago";

type ReferenceEntry = { name: string; relation: string; phone: string };
type StudyEntry = { level: string; status?: string; institution?: string };
type CategoryExperienceEntry = {
  category: string;
  experience: string;
  company?: string;
  company_id?: string;
  start_year?: number | null;
  end_year?: number | null;
  is_current?: boolean;
};

export type CandidateLike = {
  id: string;
  name: string;
  whatsapp: string;
  city_zone: string;
  birth_date: string;
  age_manual: number;
  categories: string[];
  category_other: string;
  category_experience: CategoryExperienceEntry[] | null;
  availability: string[];
  experience?: string;
  references: (ReferenceEntry | string)[] | null;
  references_text: string;
  studies?: (StudyEntry | string)[] | null;
  bio: string;
  has_own_transport?: string;
  immediate_availability?: boolean;
  expected_salary?: string;
  photo: string;
  cv_file: string;
  updated?: string;
  collectionId: string;
  collectionName: string;
};

function formatStudy(entry: StudyEntry | string): string {
  if (typeof entry === "string") return entry;
  const parts = [labelFor(STUDY_LEVELS, entry.level)];
  if (entry.status) parts.push(labelFor(STUDY_STATUS, entry.status).toLowerCase());
  const label = parts.join(" ");
  return entry.institution ? `${label} — ${entry.institution}` : label;
}

function candidateReferences(c: CandidateLike): string[] {
  const raw = c.references?.length
    ? c.references
    : c.references_text
      ? c.references_text.split(";").map((r) => r.trim()).filter(Boolean)
      : [];
  return raw.map((r) => {
    if (typeof r === "string") return r;
    return [r.name, r.relation, r.phone].filter(Boolean).join(" · ");
  });
}

export function CandidateAvatar({ candidate }: { candidate: CandidateLike }) {
  const photoUrl = candidate.photo ? pb().files.getURL(candidate, candidate.photo) : null;
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={candidate.name}
        width={56}
        height={56}
        unoptimized
        className="w-14 h-14 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center font-bold shrink-0"
      style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-primary)" }}
    >
      {candidate.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function CandidateCardBody({
  candidate,
  expanded,
  topRightBadge,
}: {
  candidate: CandidateLike;
  expanded: boolean;
  topRightBadge?: React.ReactNode;
}) {
  const age = calculateAge(candidate.birth_date, candidate.age_manual);
  const expMap = Object.fromEntries((candidate.category_experience ?? []).map((e) => [e.category, e]));
  const references = candidateReferences(candidate);
  const cvUrl = candidate.cv_file ? pb().files.getURL(candidate, candidate.cv_file) : null;
  // Mismos badges que el directorio público (/p/[slug], PostulanteCard) para no
  // desincronizar el criterio de "qué señales de confianza mostrar". Antes acá
  // se reimplementaban a mano solo "movilidad" y "puede empezar ya".
  const badges = computeCandidateBadges({
    categories: candidate.categories ?? [],
    experience: candidate.experience ?? "",
    availability: candidate.availability ?? [],
    bio: candidate.bio ?? "",
    has_own_transport: candidate.has_own_transport ?? "",
    immediate_availability: Boolean(candidate.immediate_availability),
  });
  // Congelar "ahora" al montar: Date.now() en render es impuro (regla del
  // React compiler) y para un "hace X" no hace falta que corra en vivo.
  const [now] = useState(() => Date.now());
  const updatedLabel = candidate.updated ? timeAgo(candidate.updated, now) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-1 min-w-0">
          {/* Nombre y edad truncaban juntos como un solo string -- un nombre
              completo largo empujaba la edad afuera y quedaba cortada por el
              ellipsis. Separados así, el nombre se acorta primero y la edad
              (el dato que importa para decidir) siempre se ve entera. */}
          <p className="font-bold truncate min-w-0">{candidate.name}</p>
          {age ? <span className="font-bold shrink-0">· {age} años</span> : null}
        </div>
        {topRightBadge}
      </div>
      <p className="text-sm truncate" style={{ color: "var(--tucv-muted)" }}>
        {candidate.city_zone}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {candidate.categories.map((c) => {
          const label = c === "otro" ? candidate.category_other || "Otro" : labelFor(CATEGORIES, c);
          const exp = expMap[c];
          return (
            <span
              key={c}
              className="text-xs px-2 py-1 rounded-[var(--tucv-radius)]"
              style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }}
            >
              {label}
              {exp && (
                <span style={{ color: "var(--tucv-muted)" }}>
                  {" "}
                  · {labelFor(EXPERIENCE, exp.experience)}
                  {exp.company ? ` en ${exp.company}` : ""}
                  {exp.start_year ? ` (${exp.start_year}–${exp.is_current ? "actualidad" : exp.end_year ?? ""})` : ""}
                </span>
              )}
              {exp?.company_id && (
                <span style={{ color: "#128C4A" }} title={`Trabajó en ${exp.company} — empresa verificada en TuCV`}>
                  {" "}
                  ✓
                </span>
              )}
            </span>
          );
        })}
      </div>

      <p className="text-sm mt-1.5" style={{ color: "var(--tucv-muted)" }}>
        Disponible: <span style={{ color: "var(--tucv-text)" }}>{labelsFor(AVAILABILITY, candidate.availability).join(", ")}</span>
      </p>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {badges.map((b) => (
            <span
              key={b.label}
              className="text-xs px-2 py-0.5 rounded-[var(--tucv-radius)]"
              style={BADGE_TONE_STYLE[b.tone]}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}

      {updatedLabel && (
        <p className="text-xs mt-1.5" style={{ color: "var(--tucv-muted)" }}>
          Perfil actualizado: {updatedLabel.toLowerCase()}
        </p>
      )}

      {references.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {references.map((ref, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-[var(--tucv-radius)]"
              style={{ border: "1.5px solid var(--tucv-border)", color: "var(--tucv-text)" }}
            >
              {ref}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-3 text-sm space-y-2" style={{ borderTop: "1px solid var(--tucv-border)" }}>
          {candidate.bio && <p>{candidate.bio}</p>}
          {candidate.expected_salary && (
            <p style={{ color: "var(--tucv-muted)" }}>Sueldo pretendido: {formatThousands(candidate.expected_salary)}</p>
          )}
          {candidate.studies && candidate.studies.length > 0 && (
            <div>
              <p className="font-semibold mb-1">Estudios</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.studies.map((s, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-[var(--tucv-radius)]"
                    style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }}
                  >
                    {formatStudy(s)}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p style={{ color: "var(--tucv-muted)" }}>WhatsApp: {candidate.whatsapp}</p>
          {cvUrl && (
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold"
              style={{ color: "var(--tucv-primary)" }}
            >
              Ver CV adjunto
            </a>
          )}
        </div>
      )}
    </>
  );
}
