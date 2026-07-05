"use client";

import { useEffect, useState } from "react";
import { PostulanteCard } from "@/components/postulantes/PostulanteCard";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import type { PublicCandidateListItem, PublicCandidatesStats } from "@/lib/public-candidates-list";

type ApiResponse = { items: PublicCandidateListItem[]; stats: PublicCandidatesStats };

// Prueba real para la empresa: candidatos VISIBLES de verdad (del espejo
// público seguro, sin teléfono/email). Muestra hasta 3 en la home; el resto en
// /postulantes. Un solo fetch, sin realtime (es un teaser). Estado vacío
// honesto (beta real, sin inventar volumen).
export function CandidatesPreview() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-candidates")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: ApiResponse) => {
        if (!cancelled) setData(d);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error && !data) return null; // no rompemos la home si falla el backend

  const items = data?.items.slice(0, 3) ?? [];
  const total = data?.stats.totalVisible ?? 0;

  return (
    <section className="px-4 py-10 sm:py-14" style={{ backgroundColor: "var(--tucv-surface)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-1.5">
          <h2 className="text-2xl sm:text-3xl font-bold">Candidatos visibles cerca</h2>
          {total > 0 && (
            <span
              className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-[var(--tucv-radius)] shrink-0"
              style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }}
            >
              {total} {total === 1 ? "visible" : "visibles"}
            </span>
          )}
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Personas reales que eligieron mostrarse a comercios de su zona. Sin CVs sueltos por mail.
        </p>

        {data === null ? (
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Cargando candidatos...
          </p>
        ) : items.length === 0 ? (
          <div
            className="p-6 text-center rounded-[var(--tucv-radius)]"
            style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              Estamos en beta real y arrancando. Publicá tu búsqueda y sé de los primeros en recibir
              perfiles cerca tuyo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c) => (
              <PostulanteCard key={c.id} candidate={c} />
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <TrackedLinkButton href="/postulantes" event="ver_candidatos" eventProps={{ source: "home" }}>
            Ver candidatos cerca
          </TrackedLinkButton>
          <TrackedLinkButton
            href="/empresa/busquedas/nueva"
            event="crear_busqueda"
            eventProps={{ source: "candidatos_preview" }}
            variant="secondary"
          >
            Publicar búsqueda gratis
          </TrackedLinkButton>
        </div>
      </div>
    </section>
  );
}
