"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { emptyCandidateFilters, matchesCandidateFilters, type CandidateFilters } from "@/lib/candidate-filters";
import { CATEGORIES, labelFor } from "@/lib/constants";
import { LinkButton } from "@/components/ui/Button";
import { PostulantesFilterBar } from "@/components/postulantes/PostulantesFilterBar";
import { PostulanteCard } from "@/components/postulantes/PostulanteCard";
import type { PublicCandidateListItem, PublicCandidatesStats } from "@/lib/public-candidates-list";

// Red de contención por si el push SSE llega a fallar en silencio (red que
// corta conexiones de larga duración) -- el push es el mecanismo principal.
const FALLBACK_POLL_MS = 60000;

type ApiResponse = { items: PublicCandidateListItem[]; stats: PublicCandidatesStats };

export function PostulantesDirectory() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<CandidateFilters>(emptyCandidateFilters);
  // Ahora SÍ hay push en tiempo real: el espejo public_candidate_cards es
  // público (a diferencia de candidate_profiles, cuyo listRule exige auth),
  // así que un cliente anónimo puede suscribirse -- PocketBase autoriza el
  // evento con el listRule del espejo. Mismo patrón que LiveJobsFeed: fetch
  // inicial + refetch en cada evento + poll de respaldo, con un contador
  // para descartar respuestas que llegan fuera de orden.
  const requestSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      const seq = ++requestSeq.current;
      fetch("/api/public-candidates")
        .then(async (r) => {
          if (cancelled || seq !== requestSeq.current) return;
          if (!r.ok) {
            setError(true);
            return;
          }
          const json: ApiResponse = await r.json();
          setError(false);
          setData(json);
        })
        .catch(() => {
          if (!cancelled && seq === requestSeq.current) setError(true);
        });
    }
    refresh();
    const interval = setInterval(refresh, FALLBACK_POLL_MS);

    let unsubscribe: (() => void) | undefined;
    pb()
      .collection("public_candidate_cards")
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
    if (!data) return [];
    return data.items.filter((c) => matchesCandidateFilters(c, filters));
  }, [data, filters]);

  const stats = data?.stats;

  return (
    <section className="px-4 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5 mb-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold">Gente lista para laburar cerca tuyo</h1>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-[var(--tucv-radius)]"
            style={{ backgroundColor: "#DCFCE7", color: "#128C4A", border: "1.5px solid #128C4A" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#128C4A" }} />
            En vivo
          </span>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
          Perfiles que activaron su visibilidad pública. Se actualiza solo, sin recargar. No hace
          falta cuenta para mirar.
        </p>

        {stats && stats.totalVisible > 0 && (
          <div className="flex flex-wrap gap-4 mb-6 text-sm">
            <span>
              <strong>{stats.totalVisible}</strong> postulantes visibles
            </span>
            {stats.newToday > 0 && (
              <span>
                <strong>{stats.newToday}</strong> nuevos hoy
              </span>
            )}
            {stats.activeToday > 0 && (
              <span>
                <strong>{stats.activeToday}</strong> activos hoy
              </span>
            )}
            {stats.topCategory && (
              <span>
                <strong>{labelFor(CATEGORIES, stats.topCategory)}</strong> es el rubro con más movimiento
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
          <LinkButton href="/postulante/nuevo">Crear mi perfil gratis</LinkButton>
        </div>

        <PostulantesFilterBar value={filters} onChange={setFilters} />

        {data === null && error ? (
          <div className="p-6 text-center rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)" }}>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              No pudimos cargar los perfiles. Recargá la página en un momento.
            </p>
          </div>
        ) : data === null ? (
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Buscando postulantes...
          </p>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)" }}>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              {data.items.length === 0
                ? "Todavía no hay perfiles públicos en esta zona. Sé el primero en compartir el tuyo."
                : "Ningún perfil coincide con esos filtros."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((candidate) => (
              <PostulanteCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
