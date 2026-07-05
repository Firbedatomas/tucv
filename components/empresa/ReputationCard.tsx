"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { Card } from "@/components/ui/Card";

type Reputation = {
  verified: boolean;
  activeSearches: number;
  publishedSearches: number;
  responseRate: number | null;
  totalApplications: number;
};

// La misma tasa de respuesta que ve un candidato en el link público solo se
// muestra ahí con >= 3 postulaciones; acá, en el panel de la empresa, se la
// mostramos siempre (es su propio dato) pero acompañada del total para que
// entienda sobre cuántas está calculada.
function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs mt-1 font-semibold" style={{ color: "var(--tucv-muted)" }}>
        {label}
      </p>
      {hint && (
        <p className="text-xs mt-0.5" style={{ color: "var(--tucv-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function ReputationCard() {
  const [rep, setRep] = useState<Reputation | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = pb().authStore.token;
    if (!token) return;
    let cancelled = false;
    fetch("/api/business-reputation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Reputation) => {
        if (!cancelled) setRep(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !rep) return null;

  const rate = rep.responseRate != null ? `${Math.round(rep.responseRate * 100)}%` : "—";
  const rateHint =
    rep.responseRate != null
      ? `sobre ${rep.totalApplications} ${rep.totalApplications === 1 ? "postulación" : "postulaciones"}`
      : "todavía sin postulaciones";

  // Consejo de mejora priorizado: primero lo que más mueve la confianza del
  // candidato. Si ya está todo bien, se lo reconocemos en vez de inventar una
  // tarea.
  let tip: string;
  if (rep.responseRate != null && rep.responseRate < 0.7 && rep.totalApplications > 0) {
    tip = "Respondé las postulaciones que recibís (aunque sea para descartar): sube tu tasa de respuesta y los candidatos lo ven.";
  } else if (rep.activeSearches === 0) {
    tip = "Publicá una búsqueda real y activa: las empresas con avisos vigentes generan más confianza.";
  } else if (!rep.verified) {
    tip = "Completá tu perfil para verificar tu empresa y mostrar el sello de verificada en tus avisos.";
  } else {
    tip = "Vas muy bien. Seguí respondiendo a tiempo las postulaciones para mantener tu reputación.";
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <h2 className="text-lg font-bold">Tu reputación</h2>
        {rep.verified && (
          <span
            className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-[var(--tucv-radius)]"
            style={{ backgroundColor: "#DCFCE7", color: "#128C4A", border: "1.5px solid #128C4A" }}
          >
            <span aria-hidden>✓</span> Verificada
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Metric label="Búsquedas publicadas" value={String(rep.publishedSearches)} />
        <Metric label="Activas ahora" value={String(rep.activeSearches)} />
        <Metric label="Tasa de respuesta" value={rate} hint={rateHint} />
      </div>

      <p className="text-sm" style={{ color: "var(--tucv-text)" }}>
        {tip}
      </p>
    </Card>
  );
}
