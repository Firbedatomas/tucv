"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { timeAgo } from "@/lib/time-ago";
import { LinkButton } from "@/components/ui/Button";

type Counters = {
  activeJobs: number;
  registeredCandidates: number;
  visibleCandidates: number;
  applications: number;
};
type FeedItem = { id: string; kind: string; text: string; zone: string; at: string };
type Payload = { counters: Counters; feed: FeedItem[] };
// Desglose GLOBAL de postulantes (/api/candidate-counts) -- los contadores del
// feed mezclan escalas cuando hay `city` (registrados es global, visibles es por
// ciudad), así que la caja "visibles vs registrados" usa este breakdown, donde
// total y visiblesEmpresas son ambos globales y la resta da un número real.
type Breakdown = { total: number; visiblesEmpresas: number };

const POLL_MS = 60000;

// Chips por tipo de evento -- tres grupos, cada uno con un color de la paleta
// Impacto (nada fuera de tema): perfiles en amarillo (accent), búsquedas en
// negro (text), postulaciones en naranja (primary). El `kind` viene de
// /api/public/activity; si ahí se agregan tipos nuevos, caen al chip neutro.
const FEED_CHIP: Record<string, { label: string; bg: string; fg: string }> = {
  candidate_visible: { label: "Perfil visible", bg: "var(--tucv-accent)", fg: "var(--tucv-text)" },
  profile_completed: { label: "Perfil completo", bg: "var(--tucv-accent)", fg: "var(--tucv-text)" },
  profile_shared: { label: "Perfil compartido", bg: "var(--tucv-accent)", fg: "var(--tucv-text)" },
  job_created: { label: "Nueva búsqueda", bg: "var(--tucv-text)", fg: "var(--tucv-bg)" },
  job_shared: { label: "Búsqueda compartida", bg: "var(--tucv-text)", fg: "var(--tucv-bg)" },
  application_sent: { label: "Postulación", bg: "var(--tucv-primary)", fg: "var(--tucv-primary-text)" },
};

// El `text` de la API viene como "Nueva búsqueda de {rubro}" / "Perfil visible
// de {rubro}" / "Nueva postulación en {rubro}". El chip ya dice el tipo, así que
// para el detalle nos quedamos con lo que va después del primer " de "/" en "
// (el rubro/puesto). Si no hay conector, el chip solo alcanza.
function feedDetail(text: string): string {
  const m = text.match(/ (?:de|en) (.+)$/);
  return m ? m[1] : "";
}

// "TuCV late ahora": contadores REALES + feed anonimizado de movimiento. Los
// números salen tal cual de la base (mejor real que inflado). El feed se
// refresca por polling; no decimos "en vivo" salvo que haya movimiento real.
export function LiveActivity({
  city = "",
  title = "TuCV late ahora",
  plan,
  compact = false,
}: {
  city?: string;
  title?: string;
  // Plan del negocio (solo en contexto empresa). Habilita el upsell contextual
  // a Pro cuando es "free". Undefined en la landing pública -> sin upsell.
  plan?: string;
  // Versión compacta para la home (menos alta): feed acotado + link a /radar.
  compact?: boolean;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [now, setNow] = useState(0);

  // Solo en contexto empresa (con `city`) pedimos el desglose global para la
  // caja de visibilidad. En la landing pública no se muestra, así que no se pide.
  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    fetch("/api/candidate-counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Breakdown | null) => {
        if (!cancelled && d) setBreakdown(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [city]);

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

  // "hace X" fresco entre polls: el `now` se fija en cada fetch (cada 60s);
  // este tick lo actualiza cada 30s para que los tiempos se sientan vivos sin
  // pedir data nueva. Pura percepción de tiempo real.
  useEffect(() => {
    if (!data) return;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [data]);

  if (!data) return null;
  const { counters, feed } = data;
  // La caja "visibles vs registrados" es lenguaje de empresa (aparece solo en
  // /empresa/candidatos, que pasa `city`). En la landing pública no va.
  const showVisibility = Boolean(city);
  // Números consistentes (ambos globales) desde el breakdown; mientras carga,
  // caemos a los del feed para no dejar la caja vacía, pero sin el "N no se
  // muestran" (esa resta solo es válida con el breakdown).
  const visForBox = breakdown ? breakdown.visiblesEmpresas : counters.visibleCandidates;
  const regForBox = breakdown ? breakdown.total : counters.registeredCandidates;
  const hidden = breakdown ? Math.max(0, breakdown.total - breakdown.visiblesEmpresas) : null;

  // Subtexto de cada métrica: en contexto empresa (showVisibility) leemos los
  // números en clave comercial ("qué significan para vos"); en la landing
  // pública, la lectura neutra de siempre.
  const stats: { value: number; label: string; sub: string; accent?: boolean }[] = [
    {
      value: counters.activeJobs,
      label: counters.activeJobs === 1 ? "búsqueda activa" : "búsquedas activas",
      sub: showVisibility ? "negocios compitiendo por candidatos" : "ahora mismo",
    },
    {
      value: counters.registeredCandidates,
      label: counters.registeredCandidates === 1 ? "postulante registrado" : "postulantes registrados",
      sub: showVisibility ? "ya cargaron su perfil" : "en TuCV",
    },
    {
      value: counters.visibleCandidates,
      label: counters.visibleCandidates === 1 ? "candidato visible" : "candidatos visibles",
      sub: showVisibility ? "listos para que los contactes" : "podés contactar",
      accent: true,
    },
    {
      value: counters.applications,
      label: counters.applications === 1 ? "postulación enviada" : "postulaciones enviadas",
      sub: showVisibility ? "intención real de trabajo" : "en total",
    },
  ];

  const feedList = (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Actividad reciente
      </p>
      <ul className="space-y-2">
        {(compact ? feed.slice(0, 4) : feed).map((item, i) => {
          const chip = FEED_CHIP[item.kind] ?? { label: "Movimiento", bg: "var(--tucv-surface)", fg: "var(--tucv-text)" };
          const detail = feedDetail(item.text);
          // El más reciente (el feed viene ordenado del más nuevo al más
          // viejo) lleva una barra de acento a la izquierda: el ojo cae en
          // "lo que acaba de pasar" y refuerza la sensación de tiempo real.
          const newest = i === 0;
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 p-3 rounded-[var(--tucv-radius)]"
              style={{
                backgroundColor: "var(--tucv-surface)",
                border: "2px solid var(--tucv-border)",
                borderLeft: newest ? "5px solid var(--tucv-accent)" : "2px solid var(--tucv-border)",
              }}
            >
              <span
                className="shrink-0 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-[calc(var(--tucv-radius)/1.5)]"
                style={{ backgroundColor: chip.bg, color: chip.fg }}
              >
                {chip.label}
              </span>
              {detail && (
                <span className="font-semibold truncate" style={{ color: "var(--tucv-text)" }}>
                  {detail}
                </span>
              )}
              {item.zone && (
                <span className="text-sm" style={{ color: "var(--tucv-muted)" }}>
                  · {item.zone}
                </span>
              )}
              {now > 0 && (
                <span className="text-xs ml-auto pl-2 shrink-0" style={{ color: "var(--tucv-muted)" }}>
                  {timeAgo(item.at, now).toLowerCase()}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {compact && feed.length > 4 && (
        <a href="/radar" className="inline-block text-sm font-bold underline mt-3" style={{ color: "var(--tucv-primary)" }}>
          Ver toda la actividad →
        </a>
      )}
    </div>
  );

  return (
    <section className="px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          {feed.length > 0 && (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
              style={{
                backgroundColor: "var(--tucv-primary)",
                boxShadow: "0 0 0 3px color-mix(in srgb, var(--tucv-primary) 22%, transparent)",
              }}
            />
          )}
          <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--tucv-muted)" }}>
          {showVisibility
            ? "Personas que eligieron mostrarse a negocios, búsquedas activas y postulaciones reales cerca tuyo. Se actualiza solo, sin recargar."
            : "Números reales de TuCV, ahora mismo. Se actualiza solo, sin recargar."}
        </p>

        {/* Nivel 1 -- métricas. Mismo ADN que las cards (surface, borde 2px,
            sombra dura); la de "candidatos visibles" va en amarillo porque es
            la métrica accionable para la empresa. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="p-4 sm:p-5 rounded-[var(--tucv-radius)]"
              style={{
                backgroundColor: s.accent ? "var(--tucv-accent)" : "var(--tucv-surface)",
                border: "2px solid var(--tucv-border)",
                boxShadow: "var(--tucv-shadow)",
              }}
            >
              <div className="text-3xl font-bold leading-none" style={{ color: "var(--tucv-text)" }}>
                {s.value}
              </div>
              <div className="text-sm font-semibold mt-2" style={{ color: "var(--tucv-text)" }}>
                {s.label}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: s.accent ? "rgba(21,21,21,0.65)" : "var(--tucv-muted)" }}
              >
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Nivel 2 -- actividad reciente + (en empresa) la caja de visibilidad. */}
        {(feed.length > 0 || showVisibility) && (
          <div className={showVisibility ? "grid lg:grid-cols-3 gap-4 items-start" : ""}>
            {feed.length > 0 && <div className={showVisibility ? "lg:col-span-2" : ""}>{feedList}</div>}

            {showVisibility && (
              <aside
                className="p-5 rounded-[var(--tucv-radius)]"
                style={{
                  backgroundColor: "var(--tucv-surface)",
                  border: "2px solid var(--tucv-border)",
                  boxShadow: "var(--tucv-shadow)",
                }}
              >
                <div className="w-10 h-2 mb-4" style={{ backgroundColor: "var(--tucv-accent)" }} />
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
                  Quiénes ves
                </p>
                {/* "visibles" es el número héroe (lo accionable); "registrados"
                    va secundario para dar contexto sin competir. */}
                <p className="flex items-baseline gap-1.5 mb-2" style={{ color: "var(--tucv-text)" }}>
                  <span className="text-3xl font-bold leading-none">{visForBox}</span>
                  <span className="text-sm font-semibold">visibles</span>
                  <span className="text-sm" style={{ color: "var(--tucv-muted)" }}>
                    de {regForBox} registrados
                  </span>
                </p>
                <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
                  Solo aparecen personas que eligieron ser visibles para empresas.
                  {hidden && hidden > 0
                    ? ` ${hidden} todavía no activaron visibilidad pública o tienen el perfil incompleto.`
                    : ""}
                </p>
                {/* CTAs comerciales: la acción fuerte es publicar una búsqueda
                    (así te llegan postulantes); el link secundario baja a la
                    lista para invitar/contactar a los que ya están visibles. */}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <LinkButton href="/empresa/busquedas/nueva" className="text-sm">
                    Crear búsqueda
                  </LinkButton>
                  <a
                    href="#candidatos"
                    className="text-sm font-semibold underline"
                    style={{ color: "var(--tucv-text)" }}
                  >
                    Invitá candidatos visibles
                  </a>
                </div>
              </aside>
            )}
          </div>
        )}

        {/* Upsell Pro contextual: solo negocio gratis. Explica el valor en clave
            de velocidad, no bloquea nada. De-emphasizado (surface + borde), con
            un chip Pro para ubicarlo sin gritar. */}
        {showVisibility && plan === "free" && (
          <div
            className="mt-6 p-4 sm:p-5 rounded-[var(--tucv-radius)] flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between"
            style={{
              backgroundColor: "var(--tucv-surface)",
              border: "2px solid var(--tucv-border)",
              boxShadow: "var(--tucv-shadow)",
            }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }}
                >
                  Pro
                </span>
                <p className="font-bold" style={{ color: "var(--tucv-text)" }}>
                  Cubrí puestos más rápido
                </p>
              </div>
              <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
                Con Pro tenés más búsquedas activas al mismo tiempo, más días publicadas, más
                contactos por día y prioridad en tu zona.
              </p>
            </div>
            <LinkButton href="/precios" variant="secondary" className="shrink-0 text-sm">
              Ver planes
            </LinkButton>
          </div>
        )}
      </div>
    </section>
  );
}
