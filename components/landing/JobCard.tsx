"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CATEGORIES, AVAILABILITY, EXPERIENCE, VACANCIES, JOB_PERKS, HARD_REQUIREMENTS, labelFor, labelsFor } from "@/lib/constants";
import { formatThousands } from "@/lib/format";
import { timeAgo } from "@/lib/time-ago";
import { trackEvent } from "@/lib/track";
import { businessSlugFor } from "@/lib/slug";

export type JobCardData = {
  id: string;
  slug: string;
  short_code?: string;
  name: string;
  category: string;
  category_other: string;
  address_zone: string;
  role: string;
  shift: string[];
  schedule_details?: string;
  experience_required?: string;
  vacancies?: string;
  perks?: string[];
  hard_requirements?: string[];
  salary_mode: string;
  salary_amount: string;
  business_name: string;
  business_logo_url?: string | null;
  created: string;
};

// El "hace X" se calcula recién montado en el cliente (no en el render de
// SSR) a propósito -- Date.now() en el server y en el cliente casi nunca
// coinciden exacto, y mostrar el string ya armado desde el server arriesga
// un warning de hidratación de React por texto que no matchea.
function PostedAgo({ created }: { created: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setText(timeAgo(created, Date.now())), 0);
    return () => clearTimeout(id);
  }, [created]);
  return <>{text}</>;
}

function InfoChip({ children, featured }: { children: React.ReactNode; featured?: boolean }) {
  return (
    <span
      className="text-xs font-medium px-2 py-1 rounded-[var(--tucv-radius)]"
      style={
        featured
          ? { backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" }
          : { backgroundColor: "var(--tucv-bg)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" }
      }
    >
      {children}
    </span>
  );
}

function PerkChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-xs font-medium px-2 py-1 rounded-[var(--tucv-radius)]"
      style={{ backgroundColor: "#DCFCE7", color: "#128C4A", border: "2px solid #128C4A" }}
    >
      {children}
    </span>
  );
}

function RequirementChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-xs font-semibold px-2 py-1 rounded-[var(--tucv-radius)]"
      style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" }}
    >
      {children}
    </span>
  );
}

export function JobCard({ job, featured }: { job: JobCardData; featured?: boolean }) {
  // Evaluado a propósito: mostrar TODO (tareas, mensaje visible, etc.) hace
  // la card ilegible en un listado -- estos son los datos que más ayudan a
  // autoseleccionarse o descartarse de un vistazo, el resto queda para la
  // página de la búsqueda. Beneficios y requisitos van acotados (3 y 2) con
  // un "+N" si hay más, para no volver la card infinita.
  const perks = job.perks ?? [];
  const requirements = job.hard_requirements ?? [];
  const shownPerks = perks.slice(0, 3);
  const shownRequirements = requirements.slice(0, 2);
  const hiddenCount = Math.max(0, perks.length - shownPerks.length) + Math.max(0, requirements.length - shownRequirements.length);

  const publicPath = job.short_code ? `${businessSlugFor(job.business_name)}/${job.short_code}` : job.slug;

  // Compartir la búsqueda sin navegar (la card entera es un Link): frenamos la
  // navegación y usamos Web Share API (mobile) con fallback a copiar link.
  async function shareJob(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    trackEvent("compartir_busqueda", { source: "home_feed" });
    const origin = typeof window !== "undefined" ? window.location.origin : "https://tucv.ar";
    const url = `${origin}/b/${publicPath}`;
    const title = job.role || job.name;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: `${title}${job.business_name ? ` — ${job.business_name}` : ""}`, url });
        return;
      } catch {
        // cancelado / no soportado -> copiar
      }
    }
    navigator.clipboard?.writeText(url);
  }

  return (
    <Link
      href={`/b/${publicPath}`}
      onClick={() => trackEvent("ver_busqueda", { source: "home_feed" })}
      className="block p-4 rounded-[var(--tucv-radius)] transition hover:-translate-y-0.5"
      style={{
        backgroundColor: featured ? "var(--tucv-accent)" : "var(--tucv-surface)",
        border: "2px solid var(--tucv-border)",
        boxShadow: "var(--tucv-shadow)",
      }}
    >
      <div className="flex items-start gap-3">
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
            {(job.business_name || job.role).slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              {featured ? (
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[var(--tucv-radius)] mb-1"
                  style={{ backgroundColor: "var(--tucv-text)", color: "var(--tucv-bg)" }}
                >
                  Destacada
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[var(--tucv-radius)] mb-1"
                  style={{ backgroundColor: "#DCFCE7", color: "#128C4A", border: "1.5px solid #128C4A" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#128C4A" }} />
                  Activa
                </span>
              )}
              <p className="font-bold truncate">{job.role || job.name}</p>
              <p className="text-sm truncate" style={{ color: featured ? "var(--tucv-text)" : "var(--tucv-muted)" }}>
                {job.business_name ? `${job.business_name} · ` : ""}
                {job.category === "otro" ? job.category_other || "Otro" : labelFor(CATEGORIES, job.category)}
                {job.address_zone ? ` · ${job.address_zone}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {job.salary_mode === "mostrar" && job.salary_amount && (
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-[var(--tucv-radius)]"
                  style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-primary)", border: "2px solid var(--tucv-border)" }}
                >
                  {formatThousands(job.salary_amount)}
                </span>
              )}
              <p className="text-xs whitespace-nowrap" style={{ color: featured ? "var(--tucv-text)" : "var(--tucv-muted)" }}>
                <PostedAgo created={job.created} />
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {job.shift.length > 0 && <InfoChip featured={featured}>{labelsFor(AVAILABILITY, job.shift).join(", ")}</InfoChip>}
            {job.schedule_details && <InfoChip featured={featured}>{job.schedule_details}</InfoChip>}
            {job.experience_required && (
              <InfoChip featured={featured}>{labelFor(EXPERIENCE, job.experience_required)}</InfoChip>
            )}
            {job.vacancies && <InfoChip featured={featured}>{labelFor(VACANCIES, job.vacancies)}</InfoChip>}
            {shownPerks.map((p) => (
              <PerkChip key={p}>{labelFor(JOB_PERKS, p)}</PerkChip>
            ))}
            {shownRequirements.map((r) => (
              <RequirementChip key={r}>{labelFor(HARD_REQUIREMENTS, r)}</RequirementChip>
            ))}
            {hiddenCount > 0 && <InfoChip featured={featured}>+{hiddenCount}</InfoChip>}
          </div>

          <div
            className="flex items-center gap-3 mt-3 pt-2.5"
            style={{ borderTop: featured ? "1.5px solid var(--tucv-border)" : "1.5px solid var(--tucv-border)" }}
          >
            <span className="text-xs font-bold" style={{ color: "var(--tucv-primary)" }}>
              Ver búsqueda →
            </span>
            <button
              type="button"
              onClick={shareJob}
              className="text-xs underline hover:opacity-70 transition ml-auto"
              style={{ color: featured ? "var(--tucv-text)" : "var(--tucv-muted)" }}
            >
              Compartir
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
