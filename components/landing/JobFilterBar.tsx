"use client";

import { CATEGORIES, AVAILABILITY, JOB_PERKS } from "@/lib/constants";
import type { JobFilters } from "@/lib/job-filters";
import { inputClass, inputStyle } from "@/components/ui/Field";

export function JobFilterBar({ value, onChange }: { value: JobFilters; onChange: (next: JobFilters) => void }) {
  function set<K extends keyof JobFilters>(key: K, v: JobFilters[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div
      className="p-4 rounded-[var(--tucv-radius)] mb-5"
      style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)" }}
    >
      <input
        className={`${inputClass} mb-3`}
        style={inputStyle}
        placeholder="Buscar por puesto, rubro o zona..."
        value={value.q}
        onChange={(e) => set("q", e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <select className={inputClass} style={inputStyle} value={value.category} onChange={(e) => set("category", e.target.value)}>
          <option value="">Todos los rubros</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select className={inputClass} style={inputStyle} value={value.shift} onChange={(e) => set("shift", e.target.value)}>
          <option value="">Cualquier turno</option>
          {AVAILABILITY.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select className={inputClass} style={inputStyle} value={value.perk} onChange={(e) => set("perk", e.target.value)}>
          <option value="">Cualquier condición</option>
          {JOB_PERKS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          className={inputClass}
          style={inputStyle}
          placeholder="Zona"
          value={value.zone}
          onChange={(e) => set("zone", e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm mt-3">
        <input type="checkbox" checked={value.onlyWithSalary} onChange={(e) => set("onlyWithSalary", e.target.checked)} />
        Solo con sueldo publicado
      </label>
    </div>
  );
}
