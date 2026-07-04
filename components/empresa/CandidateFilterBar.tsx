"use client";

import { CATEGORIES, EXPERIENCE, AVAILABILITY } from "@/lib/constants";
import type { CandidateFilters } from "@/lib/candidate-filters";
import { Card } from "@/components/ui/Card";
import { inputClass, inputStyle } from "@/components/ui/Field";

export function CandidateFilterBar({
  value,
  onChange,
  extra,
}: {
  value: CandidateFilters;
  onChange: (next: CandidateFilters) => void;
  extra?: React.ReactNode;
}) {
  function set<K extends keyof CandidateFilters>(key: K, v: CandidateFilters[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <Card className="mb-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
      </div>
    </Card>
  );
}
