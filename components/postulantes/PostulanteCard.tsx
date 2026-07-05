"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CATEGORIES, EXPERIENCE, AVAILABILITY, labelFor, labelsFor } from "@/lib/constants";
import { timeAgo } from "@/lib/time-ago";
import { trackEvent } from "@/lib/track";
import { emitActivity } from "@/lib/emit-activity";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ReportProfileButton } from "@/components/postulantes/ReportProfileButton";
import { PublicCandidateActions } from "@/components/postulantes/PublicCandidateActions";
import { ProfileBadges } from "@/components/postulantes/ProfileBadges";
import type { PublicCandidateListItem } from "@/lib/public-candidates-list";
import type { ShareChannel } from "@/lib/attribution";

// Igual patrón que PostedAgo en components/landing/JobCard.tsx: el "activo
// hace X" se calcula recién montado en el cliente, no en el render de SSR,
// para no arriesgar un warning de hidratación por Date.now() no coincidiendo
// entre server y cliente.
function ActiveAgo({ updated }: { updated: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setText(timeAgo(updated, Date.now()).toLowerCase()), 0);
    return () => clearTimeout(id);
  }, [updated]);
  return <>{text}</>;
}

function shareText(candidate: PublicCandidateListItem, url: string): string {
  const category = candidate.categories[0] ? labelFor(CATEGORIES, candidate.categories[0]) : "";
  const availability = candidate.availability.length ? labelsFor(AVAILABILITY, candidate.availability).join("/") : "";
  const parts = [
    `${candidate.displayName} busca laburo${candidate.city_zone ? ` en ${candidate.city_zone}` : ""}.`,
    category ? `${category}.` : "",
    availability ? `Disponible ${availability}.` : "",
    `Perfil: ${url}`,
  ].filter(Boolean);
  return parts.join(" ");
}

export function PostulanteCard({ candidate }: { candidate: PublicCandidateListItem }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tucv.ar";
  const profileUrl = `${origin}/p/${candidate.slug}`;
  const text = shareText(candidate, profileUrl);

  function track(channel: string) {
    trackEvent("Postulante: perfil compartido", { channel, source: "directorio" });
    // Compartir real (no "copiar") alimenta el feed público anonimizado.
    if (channel === "whatsapp" || channel === "x") {
      emitActivity("profile_shared", { candidateId: candidate.id });
    }
  }

  // Crea un share_link para atribución y devuelve la URL corta (/s/...), o la
  // cruda si falla la red -- nunca debe bloquear el compartir. entityId es el
  // id REAL de candidate_profiles (candidateId), no el del espejo público.
  async function resolveShareUrl(channel: ShareChannel): Promise<string> {
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "profile", entityId: candidate.candidateId, channel }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.url === "string") return data.url;
      }
    } catch {
      // Sin red / error -> link crudo.
    }
    return profileUrl;
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {candidate.photoUrl ? (
          <Image
            src={candidate.photoUrl}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="w-12 h-12 rounded-full object-cover shrink-0"
            style={{ border: "2px solid var(--tucv-border)" }}
          />
        ) : (
          <span
            className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
            style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" }}
          >
            {candidate.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-bold truncate">{candidate.displayName}</p>
          {candidate.city_zone && (
            <p className="text-sm truncate" style={{ color: "var(--tucv-muted)" }}>
              {candidate.city_zone}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {candidate.categories.slice(0, 3).map((c) => (
          <span
            key={c}
            className="text-xs font-semibold px-2 py-1 rounded-[var(--tucv-radius)]"
            style={{ backgroundColor: "var(--tucv-bg)", border: "1px solid var(--tucv-border)" }}
          >
            {labelFor(CATEGORIES, c)}
          </span>
        ))}
      </div>

      <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
        {[
          candidate.experience ? labelFor(EXPERIENCE, candidate.experience) : "",
          candidate.availability.length ? labelsFor(AVAILABILITY, candidate.availability).join(" · ") : "",
        ]
          .filter(Boolean)
          .join(" · ") || "Sin datos de experiencia cargados"}
      </p>

      {candidate.bio && (
        <p className="text-sm line-clamp-2" style={{ color: "var(--tucv-text)" }}>
          {candidate.bio}
        </p>
      )}

      <ProfileBadges candidate={candidate} />

      <p className="text-xs" style={{ color: "var(--tucv-muted)" }}>
        Activo <ActiveAgo updated={candidate.updated} />
      </p>

      <div className="flex flex-wrap items-center gap-3 mt-1">
        <LinkButton href={`/p/${candidate.slug}`} variant="secondary" className="text-sm px-3 py-2">
          Ver perfil
        </LinkButton>
        <button
          type="button"
          className="text-xs underline hover:opacity-70 transition"
          style={{ color: "var(--tucv-muted)" }}
          onClick={async () => {
            track("whatsapp");
            const shareUrl = await resolveShareUrl("whatsapp");
            const shareTextValue = shareUrl === profileUrl ? text : text.split(profileUrl).join(shareUrl);
            window.open(`https://wa.me/?text=${encodeURIComponent(shareTextValue)}`, "_blank");
          }}
        >
          WhatsApp
        </button>
        <button
          type="button"
          className="text-xs underline hover:opacity-70 transition"
          style={{ color: "var(--tucv-muted)" }}
          onClick={async () => {
            track("x");
            const shareUrl = await resolveShareUrl("x");
            const shareTextValue = shareUrl === profileUrl ? text : text.split(profileUrl).join(shareUrl);
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextValue)}`, "_blank");
          }}
        >
          X
        </button>
        <button
          type="button"
          className="text-xs underline hover:opacity-70 transition"
          style={{ color: "var(--tucv-muted)" }}
          onClick={async () => {
            track("copy");
            const shareUrl = await resolveShareUrl("copy");
            navigator.clipboard?.writeText(shareUrl);
          }}
        >
          Copiar link
        </button>
        <ReportProfileButton candidateId={candidate.id} />
      </div>

      {/* Acciones para empresas dueñas logueadas (guardar / invitar /
          solicitar contacto). Usa candidateId = id REAL de candidate_profiles,
          no candidate.id (que es el id de la fila del espejo público). Para
          anónimos y no-dueños no renderiza nada. */}
      <PublicCandidateActions candidateId={candidate.candidateId} />
    </Card>
  );
}
