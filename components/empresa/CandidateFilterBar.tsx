"use client";

import { useState } from "react";
import { CATEGORIES, EXPERIENCE, AVAILABILITY } from "@/lib/constants";
import type { CandidateFilters } from "@/lib/candidate-filters";
import { Card } from "@/components/ui/Card";
import { inputClass, inputStyle } from "@/components/ui/Field";

const DAY_MS = 24 * 60 * 60 * 1000;

export function CandidateFilterBar({
  value,
  onChange,
  extra,
  showProgramsFilter,
}: {
  value: CandidateFilters;
  onChange: (next: CandidateFilters) => void;
  extra?: React.ReactNode;
  // Solo se muestra si la búsqueda acepta programas y el plan permite
  // priorizar. NO excluye: promueve compatibles arriba.
  showProgramsFilter?: boolean;
}) {
  // La ventana elegida (24h / 7d / 30d) se guarda en estado local: el filtro
  // solo persiste el timestamp de corte absoluto (lastActivitySince), y volver
  // a mapearlo a "qué ventana es" exigiría Date.now() en render (impuro). Si el
  // padre resetea el filtro a 0, mostramos "Cualquiera" sin importar el estado.
  const [activityWindowMs, setActivityWindowMs] = useState(0);

  function set<K extends keyof CandidateFilters>(key: K, v: CandidateFilters[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <Card className="mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select
          className={inputClass}
          style={inputStyle}
          value={value.category}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="">Todos los rubros</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          className={inputClass}
          style={inputStyle}
          placeholder="Filtrar por zona"
          value={value.zone}
          onChange={(e) => set("zone", e.target.value)}
        />
        <select
          className={inputClass}
          style={inputStyle}
          value={value.experience}
          onChange={(e) => set("experience", e.target.value)}
        >
          <option value="">Cualquier experiencia</option>
          {EXPERIENCE.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          style={inputStyle}
          value={value.availability}
          onChange={(e) => set("availability", e.target.value)}
        >
          <option value="">Cualquier disponibilidad</option>
          {AVAILABILITY.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          style={inputStyle}
          value={value.lastActivitySince === 0 ? "" : String(activityWindowMs)}
          onChange={(e) => {
            // Date.now() se resuelve acá (event handler), nunca en render, para
            // no disparar el "Cannot call impure function during render" del compiler.
            const windowMs = Number(e.target.value);
            setActivityWindowMs(windowMs);
            set("lastActivitySince", windowMs > 0 ? Date.now() - windowMs : 0);
          }}
        >
          <option value="">Cualquier actividad</option>
          <option value={String(DAY_MS)}>Activos hoy</option>
          <option value={String(7 * DAY_MS)}>Últimos 7 días</option>
          <option value={String(30 * DAY_MS)}>Últimos 30 días</option>
        </select>
        {extra}
      </div>
      <div className="flex flex-wrap gap-4 mt-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.hasReferences}
            onChange={(e) => set("hasReferences", e.target.checked)}
          />
          Solo con referencias
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.hasOwnTransport}
            onChange={(e) => set("hasOwnTransport", e.target.checked)}
          />
          Con movilidad propia
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.immediateAvailability}
            onChange={(e) => set("immediateAvailability", e.target.checked)}
          />
          Disponibilidad inmediata
        </label>
        {showProgramsFilter && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.programsCompatible}
              onChange={(e) => set("programsCompatible", e.target.checked)}
            />
            Priorizar compatibles con programa
          </label>
        )}
      </div>
    </Card>
  );
}
