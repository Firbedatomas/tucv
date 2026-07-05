"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import { Card } from "@/components/ui/Card";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";

type ChannelRow = { label: string; value: number };
type Metrics = {
  hasProfile: boolean;
  name?: string;
  views?: { total: number; recent: number };
  shares?: { total: number; thisWeek: number; clicks: number; byChannel: ChannelRow[] };
  savedByCompanies?: { total: number; thisWeek: number };
  contactRequests?: { total: number; thisWeek: number };
  invitations?: { total: number; thisWeek: number };
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

export default function MiActividadPage() {
  const { isValid } = usePostulanteAuth();
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "no-profile" } | { status: "ready"; data: Metrics }
  >({ status: "loading" });

  useEffect(() => {
    if (!isValid) return;
    // isValid ya garantiza sesión de postulante -> el token existe. Si por
    // algún motivo viniera vacío, el server responde 401 y caemos en "error".
    const token = pb().authStore.token;
    let cancelled = false;
    fetch("/api/candidate-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Metrics) => {
        if (cancelled) return;
        if (!data.hasProfile) setState({ status: "no-profile" });
        else setState({ status: "ready", data });
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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Tu perfil esta semana</h1>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Cómo se está moviendo tu perfil: quién lo visita, cuánto se comparte y qué empresas se
          interesaron.
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

        {state.status === "no-profile" && (
          <Card>
            <h2 className="font-bold mb-2">Todavía no tenés perfil</h2>
            <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
              Creá tu perfil para empezar a medir cómo se mueve.
            </p>
            <Link
              href="/postulante/nuevo"
              className="inline-block font-semibold underline"
              style={{ color: "var(--tucv-text)" }}
            >
              Crear mi perfil
            </Link>
          </Card>
        )}

        {state.status === "ready" && (
          <Ready data={state.data} />
        )}
      </div>
    </main>
  );
}

function Ready({ data }: { data: Metrics }) {
  const views = data.views ?? { total: 0, recent: 0 };
  const shares = data.shares ?? { total: 0, thisWeek: 0, clicks: 0, byChannel: [] };
  const saved = data.savedByCompanies ?? { total: 0, thisWeek: 0 };
  const contact = data.contactRequests ?? { total: 0, thisWeek: 0 };
  const invites = data.invitations ?? { total: 0, thisWeek: 0 };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatBox
          label="Visitas a tu perfil"
          value={views.total.toLocaleString("es-AR")}
          hint={views.recent > 0 ? `${views.recent.toLocaleString("es-AR")} desde el último resumen` : undefined}
        />
        <StatBox
          label="Veces compartido"
          value={shares.total.toLocaleString("es-AR")}
          hint={weekHint(shares.thisWeek)}
        />
        <StatBox
          label="Clicks a tus links"
          value={shares.clicks.toLocaleString("es-AR")}
          hint="Gente que abrió un link compartido de tu perfil"
        />
        <StatBox
          label="Empresas que te guardaron"
          value={saved.total.toLocaleString("es-AR")}
          hint={weekHint(saved.thisWeek)}
        />
        <StatBox
          label="Solicitudes de contacto"
          value={contact.total.toLocaleString("es-AR")}
          hint={weekHint(contact.thisWeek)}
        />
        <StatBox
          label="Invitaciones recibidas"
          value={invites.total.toLocaleString("es-AR")}
          hint={weekHint(invites.thisWeek)}
        />
      </div>

      {/* Loop de retorno: mensaje según tenga o no visitas, siempre empujando a
          compartir el perfil para recibir más. */}
      <div
        className="mb-8 p-5 rounded-[var(--tucv-radius)] flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between"
        style={{ backgroundColor: "var(--tucv-accent)", border: "2.5px solid var(--tucv-border)", boxShadow: "4px 4px 0 var(--tucv-border)" }}
      >
        <div>
          <p className="font-bold" style={{ color: "var(--tucv-text)" }}>
            {views.total > 0
              ? `Tu perfil recibió ${views.total.toLocaleString("es-AR")} visita${views.total === 1 ? "" : "s"}`
              : "Tu perfil todavía no tiene visitas"}
          </p>
          <p className="text-sm" style={{ color: "rgba(21,21,21,0.72)" }}>
            {views.total > 0
              ? "Compartilo para que más comercios lo vean."
              : "Compartí tu link para empezar a recibir visitas de comercios."}
          </p>
        </div>
        <TrackedLinkButton
          href="/postulante/editar"
          event="compartir_perfil"
          eventProps={{ source: "mi_actividad" }}
          variant="secondary"
          className="shrink-0 text-sm"
        >
          Compartir mi perfil
        </TrackedLinkButton>
      </div>

      {shares.byChannel.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">Por dónde te comparten</h2>
          <ul className="space-y-2">
            {shares.byChannel.map((c) => (
              <li key={c.label} className="flex items-baseline justify-between text-sm">
                <span className="font-medium" style={{ color: "var(--tucv-text)" }}>
                  {c.label}
                </span>
                <span style={{ color: "var(--tucv-muted)" }}>{c.value.toLocaleString("es-AR")}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
