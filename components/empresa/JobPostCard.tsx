"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { labelFor, CATEGORIES } from "@/lib/constants";
import { timeAgo } from "@/lib/time-ago";
import {
  displayStatus,
  statusBadgeStyle,
  isFeatured,
  totalShares,
  type JobPostForStatus,
} from "@/lib/job-post-status";
import { Button, LinkButton } from "@/components/ui/Button";
import { BoostJobButton } from "@/components/empresa/BoostJobButton";
import { ExtendJobButton } from "@/components/empresa/ExtendJobButton";
import { ShareButtons } from "@/components/public-job/ShareButtons";
import { QRCodeView } from "@/components/qr/QRCodeView";
import { generateJobFlyerDataUrl } from "@/lib/job-flyer";
import { businessSlugFor } from "@/lib/slug";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Date.now() no puede llamarse directo en el cuerpo de un componente (regla
// de pureza de React) -- mismo patrón que PostedAgo en components/landing/
// JobCard.tsx: se calcula después de montar, en un efecto.
function PostedAgo({ created }: { created: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setText(timeAgo(created, Date.now())), 0);
    return () => clearTimeout(id);
  }, [created]);
  return <>{text}</>;
}

export type JobPostCardData = JobPostForStatus & {
  id: string;
  name: string;
  role: string;
  category: string;
  address_zone: string;
  slug: string;
  short_code?: string;
  created: string;
  duration_days: string;
  views?: number;
  share_counts?: { whatsapp?: number; x?: number; instagram?: number } | null;
};

export function JobPostCard({
  job,
  applicantCount,
  newCount,
  businessPlan,
  businessName,
  businessLogoUrl,
  readOnly,
  onChanged,
  onDuplicated,
}: {
  job: JobPostCardData;
  applicantCount: number | null;
  newCount: number | null;
  businessPlan?: string;
  businessName?: string;
  businessLogoUrl?: string | null;
  readOnly?: boolean;
  onChanged: (next: Partial<JobPostCardData>) => void;
  onDuplicated: (newJobId: string) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [busy, setBusy] = useState(false);

  const status = displayStatus(job);
  const featured = isFeatured(job.featured_until);
  // Formato nuevo (negocio/código) cuando hay short_code -- ver la misma
  // nota en ApplicantsPanel.tsx.
  const publicUrl = job.short_code
    ? `${BASE_URL}/b/${businessSlugFor(businessName ?? "")}/${job.short_code}`
    : `${BASE_URL}/b/${job.slug}`;
  const plan = businessPlan ?? "free";
  const canPromote = status === "Activa";
  const canPause = status === "Activa" || status === "Promocionada";
  // "Vencida" en plan gratis NO se reactiva gratis -- para eso está
  // ExtendJobButton (pago). En Pro/Equipo, que ya pagan una
  // suscripción, reactivar una vencida no debería costar de nuevo.
  const canReactivate = status === "Pausada" || status === "Cerrada" || (status === "Vencida" && plan !== "free");
  const canExtend = status === "Vencida" && plan === "free";
  const canMarkFilled = status !== "Cubierta" && status !== "Borrador";
  const shares = totalShares(job.share_counts);

  async function updateJob(patch: Record<string, unknown>, localPatch: Partial<JobPostCardData>) {
    setBusy(true);
    try {
      await pb().collection("job_posts").update(job.id, patch);
      onChanged(localPatch);
    } finally {
      setBusy(false);
    }
  }

  function pause() {
    updateJob({ status: "paused", active: false }, { status: "paused", active: false });
  }

  function reactivate() {
    // Si ya venció mientras estaba pausada/cerrada, reactivar con la fecha
    // vieja la dejaría "activa" pero invisible (expires_at en el pasado) --
    // se siente roto ("la reactivé y no aparece"). Le damos otro período
    // completo desde ahora, mismo largo que tenía al crearla.
    const days = Number(job.duration_days) || 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    updateJob(
      { status: "active", active: true, expires_at: expiresAt },
      { status: "active", active: true, expires_at: expiresAt },
    );
  }

  function markFilled() {
    updateJob({ status: "filled", active: false }, { status: "filled", active: false });
  }

  async function duplicate() {
    setBusy(true);
    try {
      const client = pb();
      const full = await client.collection("job_posts").getOne(job.id);
      const slug = `${full.slug}-copia-${Math.random().toString(36).slice(2, 6)}`;
      const created = await client.collection("job_posts").create({
        business: full.business,
        name: full.name,
        category: full.category,
        category_other: full.category_other,
        address_zone: full.address_zone,
        role: full.role,
        main_tasks: full.main_tasks,
        shift: full.shift,
        experience_required: full.experience_required,
        perks: full.perks,
        visible_message: full.visible_message,
        duration_days: full.duration_days,
        schedule_details: full.schedule_details,
        vacancies: full.vacancies,
        hard_requirements: full.hard_requirements,
        salary_mode: full.salary_mode,
        salary_amount: full.salary_amount,
        screening_questions: full.screening_questions,
        slug,
        status: "draft",
        active: false,
      });
      onDuplicated(created.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="p-4 rounded-[var(--tucv-radius)]"
      style={{
        backgroundColor: featured ? "var(--tucv-accent)" : "var(--tucv-surface)",
        border: "2px solid var(--tucv-border)",
        boxShadow: "var(--tucv-shadow)",
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div className="min-w-0">
          <p className="font-bold truncate">{job.role || job.name}</p>
          <p className="text-sm truncate mt-0.5" style={{ color: featured ? "var(--tucv-text)" : "var(--tucv-muted)" }}>
            {labelFor(CATEGORIES, job.category)} · {job.address_zone} · <PostedAgo created={job.created} />
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-[var(--tucv-radius)] shrink-0" style={statusBadgeStyle(status)}>
          {status}
        </span>
      </div>

      <p className="text-sm mb-3 flex flex-wrap gap-x-3" style={{ color: featured ? "var(--tucv-text)" : "var(--tucv-muted)" }}>
        <span>
          <span className="font-bold">{applicantCount ?? "…"}</span> postulante{applicantCount === 1 ? "" : "s"}
        </span>
        <span>
          <span className="font-bold">{newCount ?? "…"}</span> nuevo{newCount === 1 ? "" : "s"}
        </span>
        <span>
          <span className="font-bold">{job.views ?? 0}</span> vista{(job.views ?? 0) === 1 ? "" : "s"}
        </span>
        <span>
          <span className="font-bold">{shares}</span> compartido{shares === 1 ? "" : "s"}
        </span>
      </p>

      {/* Loop de retorno: si está activa y todavía no llegan postulaciones,
          empujamos a compartir el cartel (el botón "QR para vidriera" está acá
          abajo). Mensaje según haya o no visitas todavía. */}
      {!readOnly && (status === "Activa" || status === "Promocionada") && (applicantCount ?? 0) === 0 && (
        <p className="text-xs mb-2 font-semibold" style={{ color: "var(--tucv-primary)" }}>
          {(job.views ?? 0) === 0
            ? "Compartí tu link o el cartel para empezar a recibir postulantes."
            : "Tuvo visitas pero aún sin postulaciones — compartí el cartel para recibir más candidatos."}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <LinkButton href={`/empresa/busquedas/${job.id}`}>Ver postulantes</LinkButton>
        {/* QR/cartel siempre disponible para cualquier búsqueda -- es lo que la
            empresa imprime y pega en la vidriera; no debería estar escondido en
            "Más acciones" ni solo en la pantalla de detalle. */}
        <Button type="button" variant="secondary" onClick={() => setShowQr((v) => !v)}>
          {showQr ? "Ocultar QR" : "QR para vidriera"}
        </Button>
        {/* Una vez publicada, no se puede editar -- cambiar el puesto/
            requisitos después de que alguien ya se postuló en base a lo
            original sería confuso para esa persona. Solo se puede editar
            mientras sigue en borrador (todavía no es pública); para
            cambiar algo de una ya publicada, la opción es pausarla y
            duplicarla (ver "Más acciones" abajo). */}
        {!readOnly && status === "Borrador" && (
          <LinkButton href={`/empresa/busquedas/${job.id}/editar`} variant="secondary">
            Editar
          </LinkButton>
        )}
        {!readOnly && (canPromote || featured) && <BoostJobButton jobPostId={job.id} featuredUntil={job.featured_until} />}
      </div>

      {showQr && (
        <div
          className="mt-3 pt-3 flex flex-col sm:flex-row items-center gap-4"
          style={{ borderTop: "1.5px solid var(--tucv-border)" }}
        >
          <QRCodeView
            url={publicUrl}
            fileName={job.slug}
            flyerButtonLabel="Descargar cartel para vidriera"
            renderFlyer={(qrDataUrl) =>
              generateJobFlyerDataUrl({
                role: job.role || job.name,
                businessName: businessName ?? "",
                qrDataUrl,
                logoUrl: businessLogoUrl,
              })
            }
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="text-xs font-semibold hover:opacity-70 transition"
        style={{ color: featured ? "var(--tucv-text)" : "var(--tucv-primary)" }}
      >
        {showMore ? "Ocultar acciones" : "Más acciones"}
      </button>

      {showMore && (
        <div className="mt-3 pt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm" style={{ borderTop: "1.5px solid var(--tucv-border)" }}>
          <button
            type="button"
            onClick={() => setShowShare((v) => !v)}
            className="font-semibold hover:opacity-70 transition"
            style={{ color: "var(--tucv-text)" }}
          >
            Compartir
          </button>
          {!readOnly && canPause && (
            <button type="button" onClick={pause} disabled={busy} className="font-semibold hover:opacity-70 transition disabled:opacity-50">
              Pausar
            </button>
          )}
          {!readOnly && canReactivate && (
            <button type="button" onClick={reactivate} disabled={busy} className="font-semibold hover:opacity-70 transition disabled:opacity-50">
              Reactivar
            </button>
          )}
          {!readOnly && canMarkFilled && (
            <button type="button" onClick={markFilled} disabled={busy} className="font-semibold hover:opacity-70 transition disabled:opacity-50">
              Marcar como cubierta
            </button>
          )}
          {!readOnly && (
            <button type="button" onClick={duplicate} disabled={busy} className="font-semibold hover:opacity-70 transition disabled:opacity-50">
              Duplicar
            </button>
          )}
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:opacity-70 transition"
          >
            Ver publicación
          </a>
        </div>
      )}

      {showShare && (
        <div className="mt-2">
          <ShareButtons jobId={job.id} url={publicUrl} title={job.role || job.name} />
        </div>
      )}

      {!readOnly && canPromote && !featured && (
        <div
          className="mt-3 p-3 rounded-[var(--tucv-radius)] text-sm"
          style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}
        >
          <p className="font-semibold">
            Conseguí más postulantes. Destacá esta búsqueda por 7 días y aparecé arriba en tu zona.
          </p>
        </div>
      )}

      {!readOnly && canExtend && (
        <div
          className="mt-3 p-3 rounded-[var(--tucv-radius)] text-sm"
          style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}
        >
          <p className="font-semibold mb-2">
            Esta búsqueda venció. Sumale 15 días más sin perder el link ni el QR que ya compartiste.
          </p>
          <ExtendJobButton jobPostId={job.id} expiresAt={job.expires_at} />
        </div>
      )}
    </div>
  );
}
