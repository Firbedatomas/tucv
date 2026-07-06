"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { pb } from "@/lib/pocketbase";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { displayStatus, type DisplayStatus } from "@/lib/job-post-status";
import { JobPostCard, type JobPostCardData } from "@/components/empresa/JobPostCard";

type Tab = "activas" | "borradores" | "pausadas" | "cubiertas" | "todas";

const TABS: { key: Tab; label: string }[] = [
  { key: "activas", label: "Activas" },
  { key: "borradores", label: "Borradores" },
  { key: "pausadas", label: "Pausadas" },
  { key: "cubiertas", label: "Cubiertas" },
  { key: "todas", label: "Todas" },
];

function matchesTab(status: DisplayStatus, tab: Tab): boolean {
  if (tab === "todas") return true;
  if (tab === "activas") return status === "Activa" || status === "Promocionada";
  if (tab === "borradores") return status === "Borrador";
  if (tab === "pausadas") return status === "Pausada";
  if (tab === "cubiertas") return status === "Cubierta";
  return true;
}

// `businessId` viene del padre (ya resuelto ahí) a propósito: si esta lista
// hiciera su PROPIA consulta a business_accounts en paralelo con otra igual
// en la página padre, el SDK de PocketBase cancela automáticamente
// requests duplicados en vuelo -> uno de los dos termina en el catch()
// creyendo que no hay cuenta de negocio. Un solo fetch, pasado por prop.
export function JobPostList({
  businessId,
  businessPlan,
  businessName,
  businessLogoUrl,
  readOnly,
}: {
  businessId: string | null;
  businessPlan?: string;
  businessName?: string;
  businessLogoUrl?: string | null;
  readOnly?: boolean;
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "empty" } | { status: "ready"; items: JobPostCardData[] }
  >({ status: "loading" });
  const [counts, setCounts] = useState<Record<string, { total: number; nuevos: number }>>({});
  const [tab, setTab] = useState<Tab>("activas");

  useEffect(() => {
    if (!businessId) return;
    const client = pb();

    (async () => {
      const jobs = await client
        .collection("job_posts")
        .getFullList<JobPostCardData>({ filter: `business="${businessId}"`, sort: "-created" });

      if (jobs.length === 0) {
        setState({ status: "empty" });
        return;
      }
      setState({ status: "ready", items: jobs });

      // requestKey único por job: sin esto, el SDK de PocketBase autocancela
      // los pedidos concurrentes a la misma colección ("applications") entre
      // sí, y todos menos uno terminan abortados.
      const entries = await Promise.all(
        jobs.map(async (job) => {
          const apps = await client.collection("applications").getFullList({
            filter: `job_post="${job.id}"`,
            fields: "status",
            requestKey: `count-${job.id}`,
          });
          const nuevos = apps.filter((a) => a.status === "nuevo").length;
          return [job.id, { total: apps.length, nuevos }] as const;
        }),
      );
      setCounts(Object.fromEntries(entries));
    })();
  }, [businessId]);

  function updateJobLocal(jobId: string, patch: Partial<JobPostCardData>) {
    setState((s) => (s.status === "ready" ? { ...s, items: s.items.map((j) => (j.id === jobId ? { ...j, ...patch } : j)) } : s));
  }

  if (state.status === "loading") {
    return (
      <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
        Cargando tus búsquedas...
      </p>
    );
  }

  if (state.status === "empty") {
    if (readOnly) {
      return (
        <Card className="text-center">
          <h2 className="font-bold mb-2">Todavía no hay ninguna búsqueda</h2>
        </Card>
      );
    }
    // Activación de empresa nueva: los 4 pasos para arrancar. El paso 1 es la
    // acción primaria; el QR y el WhatsApp quedan como próximos pasos (se
    // desbloquean al publicar); "ver candidatos" ya está disponible. Esto
    // reemplaza el panel vacío sin norte.
    return (
      <Card>
        <h2 className="font-bold text-lg mb-1">Poné tu primera búsqueda a trabajar</h2>
        <p className="text-sm mb-5" style={{ color: "var(--tucv-muted)" }}>
          4 pasos para empezar a recibir postulantes de tu zona:
        </p>
        <ActivationStep n={1} active title="Publicá tu primera búsqueda" hint="Gratis, en 2 minutos.">
          <LinkButton href="/empresa/busquedas/nueva">Publicar búsqueda</LinkButton>
        </ActivationStep>
        <ActivationStep n={2} title="Imprimí el QR y pegalo en la vidriera" hint="Se genera solo al publicar." />
        <ActivationStep n={3} title="Compartilo por WhatsApp" hint="A tus contactos y grupos del barrio." />
        <ActivationStep n={4} title="Mirá los candidatos de tu zona" hint="Ya hay gente cerca tuyo.">
          <LinkButton href="/empresa/candidatos" variant="secondary">
            Ver candidatos cerca
          </LinkButton>
        </ActivationStep>
      </Card>
    );
  }

  return (
    <ReadyList
      items={state.items}
      counts={counts}
      tab={tab}
      setTab={setTab}
      onChanged={updateJobLocal}
      businessPlan={businessPlan ?? "free"}
      businessName={businessName}
      businessLogoUrl={businessLogoUrl}
      readOnly={readOnly}
    />
  );
}

// Un paso de la activación de empresa nueva. `active` = el paso accionable
// ahora (número resaltado, título a contraste pleno); los pendientes van
// apagados (número en outline, título en muted) para que la jerarquía empuje
// al paso 1 sin ruido.
function ActivationStep({
  n,
  title,
  hint,
  active = false,
  children,
}: {
  n: number;
  title: string;
  hint: string;
  active?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className="flex gap-3 py-3"
      style={{ borderTop: n > 1 ? "1px solid var(--tucv-border)" : undefined }}
    >
      <div
        className="shrink-0 flex items-center justify-center text-sm font-bold rounded-full"
        style={{
          width: 28,
          height: 28,
          backgroundColor: active ? "var(--tucv-primary)" : "transparent",
          color: active ? "var(--tucv-primary-text)" : "var(--tucv-muted)",
          border: active ? "none" : "1.5px solid var(--tucv-border)",
        }}
      >
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm" style={{ color: active ? "var(--tucv-text)" : "var(--tucv-muted)" }}>
          {title}
        </p>
        <p className="text-xs" style={{ color: "var(--tucv-muted)", marginBottom: children ? 8 : 0 }}>
          {hint}
        </p>
        {children}
      </div>
    </div>
  );
}

function ReadyList({
  items,
  counts,
  tab,
  setTab,
  onChanged,
  businessPlan,
  businessName,
  businessLogoUrl,
  readOnly,
}: {
  items: JobPostCardData[];
  counts: Record<string, { total: number; nuevos: number }>;
  tab: Tab;
  setTab: (t: Tab) => void;
  onChanged: (jobId: string, patch: Partial<JobPostCardData>) => void;
  businessPlan: string;
  businessName?: string;
  businessLogoUrl?: string | null;
  readOnly?: boolean;
}) {
  const withStatus = useMemo(() => items.map((job) => ({ job, status: displayStatus(job) })), [items]);

  const summary = useMemo(() => {
    let active = 0;
    let filled = 0;
    let totalApplicants = 0;
    let totalNew = 0;
    for (const { job, status } of withStatus) {
      if (status === "Activa" || status === "Promocionada") active++;
      if (status === "Cubierta") filled++;
      const c = counts[job.id];
      totalApplicants += c?.total ?? 0;
      totalNew += c?.nuevos ?? 0;
    }
    return { active, filled, totalApplicants, totalNew };
  }, [withStatus, counts]);

  const filtered = withStatus.filter(({ status }) => matchesTab(status, tab));

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { n: summary.active, label: "búsqueda" + (summary.active === 1 ? "" : "s") + " activa" + (summary.active === 1 ? "" : "s") },
          { n: summary.totalApplicants, label: "postulante" + (summary.totalApplicants === 1 ? "" : "s") + " en total" },
          { n: summary.totalNew, label: "nuevo" + (summary.totalNew === 1 ? "" : "s") },
          { n: summary.filled, label: "cubierta" + (summary.filled === 1 ? "" : "s") },
        ].map((s, i) => (
          <div key={i} className="text-sm">
            <p className="text-xl font-bold">{s.n}</p>
            <p style={{ color: "var(--tucv-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="text-sm font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border-2 transition"
            style={
              tab === t.key
                ? { backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)", borderColor: "var(--tucv-border)" }
                : { backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)", borderColor: "var(--tucv-border)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            No tenés búsquedas en &quot;{TABS.find((t) => t.key === tab)?.label}&quot; todavía.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ job }) => (
            <JobPostCard
              key={job.id}
              job={job}
              applicantCount={counts[job.id]?.total ?? null}
              newCount={counts[job.id]?.nuevos ?? null}
              businessPlan={businessPlan}
              businessName={businessName}
              businessLogoUrl={businessLogoUrl}
              readOnly={readOnly}
              onChanged={(patch) => onChanged(job.id, patch)}
              onDuplicated={(newJobId) => {
                window.location.href = `/empresa/busquedas/${newJobId}/editar`;
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
