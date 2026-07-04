"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { timeAgo } from "@/lib/time-ago";

type Counters = {
  activeJobs: number;
  registeredCandidates: number;
  visibleCandidates: number;
  applications: number;
};
type FeedItem = { id: string; kind: string; text: string; zone: string; at: string };
type Payload = { counters: Counters; feed: FeedItem[] };

const POLL_MS = 60000;

// "TuCV late ahora": contadores REALES + feed anonimizado de movimiento. Los
// números salen tal cual de la base (mejor real que inflado). El feed se
// refresca por polling; no decimos "en vivo" salvo que haya movimiento real.
export function LiveActivity({ city = "", title = "TuCV late ahora" }: { city?: string; title?: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const url = city ? `/api/public/activity?city=${encodeURIComponent(city)}` : "/api/public/activity";
    const load = () =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Payload | null) => {
          if (!cancelled && d) {
            setData(d);
            setNow(Date.now());
          }
        })
        .catch(() => {});
    load();
    // Realtime: los mismos listRule públicos que ya habilitan el feed de
    // búsquedas permiten a un cliente anónimo suscribirse. Refrescamos ante
    // cualquier evento/búsqueda/perfil nuevo, con polling de respaldo.
    const subs: Array<Promise<() => void>> = [
      pb().collection("activity_events").subscribe("*", () => load()),
      pb().collection("job_posts").subscribe("*", () => load()),
    ];
    const t = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
      subs.forEach((p) => p.then((unsub) => unsub()).catch(() => {}));
    };
  }, [city]);

  if (!data) return null;
  const { counters, feed } = data;
  const stats: { value: number; label: string }[] = [
    { value: counters.activeJobs, label: counters.activeJobs === 1 ? "búsqueda activa" : "búsquedas activas" },
    {
      value: counters.registeredCandidates,
      label: counters.registeredCandidates === 1 ? "postulante registrado" : "postulantes registrados",
    },
    {
      value: counters.visibleCandidates,
      label: counters.visibleCandidates === 1 ? "candidato visible" : "candidatos visibles",
    },
    {
      value: counters.applications,
      label: counters.applications === 1 ? "postulación enviada" : "postulaciones enviadas",
    },
  ];

  return (
    <section className="px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          {feed.length > 0 && (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "#128C4A", boxShadow: "0 0 0 3px rgba(18,140,74,0.2)" }}
            />
          )}
          <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="p-4 rounded-[var(--tucv-radius)] border"
              style={{ borderColor: "var(--tucv-border)" }}
            >
              <div className="text-2xl font-bold" style={{ color: "var(--tucv-text)" }}>
                {s.value}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {feed.length > 0 && (
          <ul className="space-y-2">
            {feed.map((item) => (
              <li key={item.id} className="text-sm flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium" style={{ color: "var(--tucv-muted)" }}>
                  •
                </span>
                <span style={{ color: "var(--tucv-text)" }}>{item.text}</span>
                {item.zone && <span style={{ color: "var(--tucv-muted)" }}>en {item.zone}</span>}
                {now > 0 && (
                  <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
                    · {timeAgo(item.at, now).toLowerCase()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
