"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { emptyJobFilters, matchesJobFilters, type JobFilters } from "@/lib/job-filters";
import type { PublicJobListItem } from "@/lib/public-jobs-list";
import { JobFilterBar } from "@/components/landing/JobFilterBar";
import { JobCard } from "@/components/landing/JobCard";

// Red de contención por si el push llega a fallar en silencio (ej. una red
// que corta conexiones SSE de larga duración sin avisar) -- el push
// instantáneo vía subscribe() es el mecanismo principal.
const FALLBACK_POLL_MS = 60000;

// Sin login: job_posts tiene listRule restringido al negocio dueño para
// LISTAR, así que el listado inicial sale de /api/public-jobs (server-side,
// superusuario). El listRule ahora también permite público lo que está
// activo y no vencido (migración 1783150000) -- eso es lo que habilita el
// push real: PocketBase usa el listRule (no el viewRule) para autorizar el
// evento de "creación" en una suscripción de colección entera a un cliente
// anónimo, confirmado probándolo en producción. No hace falta un servidor
// de WebSocket aparte: el SDK ya trae esto (server-sent events).
export function LiveJobsFeed() {
  const [jobs, setJobs] = useState<PublicJobListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<JobFilters>(emptyJobFilters);
  // El poll cada 60s, cada evento en tiempo real, y el pedido inicial pueden
  // pisarse entre sí -- si el de recién (poll) tarda más que el disparado
  // después (evento realtime), su respuesta llega última y "revierte" el
  // feed a datos viejos. Un contador de la request más reciente descarta
  // cualquier respuesta que ya quedó vieja para cuando vuelve.
  const requestSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      const seq = ++requestSeq.current;
      fetch("/api/public-jobs")
        .then(async (r) => {
          if (cancelled || seq !== requestSeq.current) return;
          if (!r.ok) {
            setError(true);
            return;
          }
          const data: PublicJobListItem[] = await r.json();
          setError(false);
          setJobs(data);
        })
        .catch(() => {
          if (!cancelled && seq === requestSeq.current) setError(true);
        });
    }
    refresh();
    const interval = setInterval(refresh, FALLBACK_POLL_MS);

    let unsubscribe: (() => void) | undefined;
    pb()
      .collection("job_posts")
      .subscribe("*", () => refresh())
      .then((unsub) => {
        if (cancelled) {
          unsub();
          return;
        }
        unsubscribe = unsub;
      })
      .catch(() => {
        // Sin push (ej. red que bloquea SSE) el polling de arriba sigue
        // andando igual -- no es motivo para romper la página.
      });

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribe?.();
    };
  }, []);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((j) => matchesJobFilters(j, filters));
  }, [jobs, filters]);

  return (
    <section className="px-4 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5 mb-1.5">
          <h2 className="text-2xl sm:text-3xl font-bold">Búsquedas activas ahora</h2>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-[var(--tucv-radius)]"
            style={{ backgroundColor: "#DCFCE7", color: "#128C4A", border: "1.5px solid #128C4A" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#128C4A" }} />
            En vivo
          </span>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Se actualiza solo, sin recargar la página. No hace falta cuenta para mirar.
        </p>

        <JobFilterBar value={filters} onChange={setFilters} />

        {jobs === null && error ? (
          <div
            className="p-6 text-center rounded-[var(--tucv-radius)]"
            style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              No pudimos cargar las búsquedas. Recargá la página en un momento.
            </p>
          </div>
        ) : jobs === null ? (
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Buscando búsquedas activas...
          </p>
        ) : filtered.length === 0 ? (
          <div
            className="p-6 text-center rounded-[var(--tucv-radius)]"
            style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              {jobs.length === 0
                ? "Todavía no hay búsquedas activas publicadas."
                : "Ninguna búsqueda coincide con esos filtros."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} featured={job.featured} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
