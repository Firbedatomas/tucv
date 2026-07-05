"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { Card } from "@/components/ui/Card";

type ChannelRow = { channel: string; links: number; clicks: number };
type JobRow = {
  id: string;
  name: string;
  active: boolean;
  views: number;
  shares: number;
  applications: number;
};
type Metrics = {
  jobs: { total: number; active: number };
  views: { total: number };
  shares: { fromCounters: number; links: number; clicks: number };
  channels: ChannelRow[];
  applications: { total: number; thisWeek: number };
  savedCandidates: { total: number; thisWeek: number };
  perJob: JobRow[];
};

function StatBox({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div
      className="rounded-[var(--tucv-radius)] p-5"
      style={{
        backgroundColor: "var(--tucv-surface)",
        border: "2px solid var(--tucv-border)",
        boxShadow: "var(--tucv-shadow)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tucv-muted)" }}>
        {label}
      </p>
      <p className="text-3xl font-bold mt-1" style={{ color: "var(--tucv-text)" }}>
        {value}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function weekHint(n: number): string | undefined {
  if (n <= 0) return undefined;
  return `${n.toLocaleString("es-AR")} esta semana`;
}

export default function EmpresaActividadPage() {
  const { isValid } = useBusinessAuth();
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ready"; data: Metrics }
  >({ status: "loading" });

  useEffect(() => {
    if (!isValid) return;
    // isValid ya garantiza sesión de empresa -> el token existe. Si por algún
    // motivo viniera vacío, el server responde 401 y caemos en "error".
    const token = pb().authStore.token;
    let cancelled = false;
    fetch("/api/business-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Metrics) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [isValid]);

  if (!isValid) return null;

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Tu actividad</h1>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Qué está pasando con tus búsquedas: cuánto se ven, por dónde se comparten y qué respuesta
          traen.
        </p>

        {state.status === "loading" && (
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Cargando tu actividad...
          </p>
        )}

        {state.status === "error" && (
          <Card>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              No pudimos cargar tu actividad ahora. Probá de nuevo en un rato.
            </p>
          </Card>
        )}

        {state.status === "ready" && <Ready data={state.data} />}
      </div>
    </main>
  );
}

function Ready({ data }: { data: Metrics }) {
  const noJobs = data.jobs.total === 0;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatBox
          label="Vistas de tus avisos"
          value={data.views.total.toLocaleString("es-AR")}
        />
        <StatBox
          label="Clicks desde QR / links"
          value={data.shares.clicks.toLocaleString("es-AR")}
          hint={data.shares.links > 0 ? `${data.shares.links.toLocaleString("es-AR")} links compartidos` : undefined}
        />
        <StatBox
          label="Postulaciones"
          value={data.applications.total.toLocaleString("es-AR")}
          hint={weekHint(data.applications.thisWeek)}
        />
        <StatBox
          label="Candidatos guardados"
          value={data.savedCandidates.total.toLocaleString("es-AR")}
          hint={weekHint(data.savedCandidates.thisWeek)}
        />
        <StatBox
          label="Avisos activos"
          value={data.jobs.active.toLocaleString("es-AR")}
          hint={data.jobs.total > data.jobs.active ? `${data.jobs.total.toLocaleString("es-AR")} en total` : undefined}
        />
        <StatBox
          label="Veces compartido"
          value={data.shares.fromCounters.toLocaleString("es-AR")}
          hint="Botones de compartir de tus avisos"
        />
      </div>

      {noJobs && (
        <Card className="mb-6">
          <h2 className="font-bold mb-2">Todavía no publicaste ninguna búsqueda</h2>
          <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
            Cuando publiques tu primer aviso, acá vas a ver cómo se mueve.
          </p>
          <Link
            href="/empresa/busquedas"
            className="inline-block font-semibold underline"
            style={{ color: "var(--tucv-text)" }}
          >
            Publicar una búsqueda
          </Link>
        </Card>
      )}

      {data.channels.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-semibold mb-3">Clicks por canal</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--tucv-border)" }}>
                  <th className="py-2 pr-2 text-left font-semibold" style={{ color: "var(--tucv-text)" }}>
                    Canal
                  </th>
                  <th className="py-2 px-2 text-right font-semibold" style={{ color: "var(--tucv-text)" }}>
                    Links
                  </th>
                  <th className="py-2 pl-2 text-right font-semibold" style={{ color: "var(--tucv-text)" }}>
                    Clicks
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((c, i) => (
                  <tr key={c.channel} style={i > 0 ? { borderTop: "1px solid var(--tucv-border)" } : undefined}>
                    <td className="py-2 pr-2" style={{ color: "var(--tucv-text)" }}>
                      {c.channel}
                    </td>
                    <td className="py-2 px-2 text-right" style={{ color: "var(--tucv-muted)" }}>
                      {c.links.toLocaleString("es-AR")}
                    </td>
                    <td className="py-2 pl-2 text-right font-semibold" style={{ color: "var(--tucv-text)" }}>
                      {c.clicks.toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data.perJob.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">Por aviso</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--tucv-border)" }}>
                  <th className="py-2 pr-2 text-left font-semibold" style={{ color: "var(--tucv-text)" }}>
                    Aviso
                  </th>
                  <th className="py-2 px-2 text-right font-semibold" style={{ color: "var(--tucv-text)" }}>
                    Vistas
                  </th>
                  <th className="py-2 px-2 text-right font-semibold" style={{ color: "var(--tucv-text)" }}>
                    Compartido
                  </th>
                  <th className="py-2 pl-2 text-right font-semibold" style={{ color: "var(--tucv-text)" }}>
                    Postulaciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.perJob.map((j, i) => (
                  <tr key={j.id} style={i > 0 ? { borderTop: "1px solid var(--tucv-border)" } : undefined}>
                    <td className="py-2 pr-2" style={{ color: j.active ? "var(--tucv-text)" : "var(--tucv-muted)" }}>
                      {j.name}
                      {!j.active && (
                        <span className="ml-1 text-xs" style={{ color: "var(--tucv-muted)" }}>
                          (inactivo)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right" style={{ color: "var(--tucv-muted)" }}>
                      {j.views.toLocaleString("es-AR")}
                    </td>
                    <td className="py-2 px-2 text-right" style={{ color: "var(--tucv-muted)" }}>
                      {j.shares.toLocaleString("es-AR")}
                    </td>
                    <td className="py-2 pl-2 text-right font-semibold" style={{ color: "var(--tucv-text)" }}>
                      {j.applications.toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
