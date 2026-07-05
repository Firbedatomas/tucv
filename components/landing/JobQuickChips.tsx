"use client";

import { emptyJobFilters, type JobFilters } from "@/lib/job-filters";
import { trackEvent } from "@/lib/track";

type Chip = {
  label: string;
  patch: Partial<JobFilters>;
  isActive: (f: JobFilters) => boolean;
  event: "filtro_rubro" | "filtro_chip" | "filtro_zona";
};

// Chips que aplican un FILTRO REAL sobre el feed de búsquedas (mismo JobFilters
// que la barra). Solo incluimos los que mapean a un campo real (no decorativos).
const CHIPS: Chip[] = [
  { label: "Atención al público", patch: { category: "atencion" }, isActive: (f) => f.category === "atencion", event: "filtro_rubro" },
  { label: "Caja", patch: { category: "caja" }, isActive: (f) => f.category === "caja", event: "filtro_rubro" },
  { label: "Reposición", patch: { category: "reposicion" }, isActive: (f) => f.category === "reposicion", event: "filtro_rubro" },
  { label: "Limpieza", patch: { category: "limpieza" }, isActive: (f) => f.category === "limpieza", event: "filtro_rubro" },
  { label: "Administración", patch: { category: "administracion_basica" }, isActive: (f) => f.category === "administracion_basica", event: "filtro_rubro" },
  { label: "Ventas", patch: { category: "ventas" }, isActive: (f) => f.category === "ventas", event: "filtro_rubro" },
  { label: "Part time", patch: { shift: "part_time" }, isActive: (f) => f.shift === "part_time", event: "filtro_chip" },
  { label: "Full time", patch: { shift: "full_time" }, isActive: (f) => f.shift === "full_time", event: "filtro_chip" },
  { label: "Con sueldo", patch: { onlyWithSalary: true }, isActive: (f) => f.onlyWithSalary, event: "filtro_chip" },
  { label: "Córdoba", patch: { zone: "Córdoba" }, isActive: (f) => f.zone.toLowerCase().includes("córdoba"), event: "filtro_zona" },
];

export function JobQuickChips({
  value,
  onChange,
}: {
  value: JobFilters;
  onChange: (next: JobFilters) => void;
}) {
  function toggle(chip: Chip) {
    if (chip.isActive(value)) {
      const reset = {} as Partial<JobFilters>;
      for (const k of Object.keys(chip.patch) as (keyof JobFilters)[]) {
        (reset as Record<string, unknown>)[k] = emptyJobFilters[k];
      }
      onChange({ ...value, ...reset });
      return;
    }
    onChange({ ...value, ...chip.patch });
    trackEvent(chip.event, { chip: chip.label });
  }

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {CHIPS.map((chip) => {
        const active = chip.isActive(value);
        return (
          <button
            key={chip.label}
            type="button"
            onClick={() => toggle(chip)}
            className="text-sm px-3 py-1.5 rounded-[var(--tucv-radius)] border-2 transition"
            style={
              active
                ? { backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)", borderColor: "var(--tucv-border)", boxShadow: "2px 2px 0 var(--tucv-border)" }
                : { backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)", borderColor: "var(--tucv-border)" }
            }
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
