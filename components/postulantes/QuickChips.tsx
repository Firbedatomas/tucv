"use client";

import { emptyCandidateFilters, type CandidateFilters } from "@/lib/candidate-filters";
import { trackEvent } from "@/lib/track";

type Chip = {
  label: string;
  patch: Partial<CandidateFilters>;
  isActive: (f: CandidateFilters) => boolean;
  event: "filtro_chip" | "filtro_chip" | "filtro_chip";
};

// Cada chip aplica un FILTRO REAL sobre el estado del directorio (mismo
// CandidateFilters que la barra de filtros), no es decorativo. Toggle: si ya
// está activo, lo limpia. Los de rubro limpian entre sí (category vs
// categoryAny) para no mezclar dos rubros.
const CHIPS: Chip[] = [
  { label: "Atención al público", patch: { category: "atencion", categoryAny: undefined }, isActive: (f) => f.category === "atencion", event: "filtro_chip" },
  { label: "Gastronomía", patch: { category: "", categoryAny: ["cocina", "moza_mozo", "barista", "panaderia"] }, isActive: (f) => !!f.categoryAny?.length, event: "filtro_chip" },
  { label: "Caja", patch: { category: "caja", categoryAny: undefined }, isActive: (f) => f.category === "caja", event: "filtro_chip" },
  { label: "Reposición", patch: { category: "reposicion", categoryAny: undefined }, isActive: (f) => f.category === "reposicion", event: "filtro_chip" },
  { label: "Limpieza", patch: { category: "limpieza", categoryAny: undefined }, isActive: (f) => f.category === "limpieza", event: "filtro_chip" },
  { label: "Administración", patch: { category: "administracion_basica", categoryAny: undefined }, isActive: (f) => f.category === "administracion_basica", event: "filtro_chip" },
  { label: "Ventas", patch: { category: "ventas", categoryAny: undefined }, isActive: (f) => f.category === "ventas", event: "filtro_chip" },
  { label: "Sin experiencia", patch: { experience: "sin_experiencia" }, isActive: (f) => f.experience === "sin_experiencia", event: "filtro_chip" },
  { label: "Part time", patch: { availability: "part_time" }, isActive: (f) => f.availability === "part_time", event: "filtro_chip" },
  { label: "Full time", patch: { availability: "full_time" }, isActive: (f) => f.availability === "full_time", event: "filtro_chip" },
  { label: "Puede empezar ya", patch: { immediateAvailability: true }, isActive: (f) => f.immediateAvailability, event: "filtro_chip" },
  { label: "Córdoba", patch: { zone: "Córdoba" }, isActive: (f) => f.zone.toLowerCase().includes("córdoba"), event: "filtro_chip" },
];

export function QuickChips({
  value,
  onChange,
}: {
  value: CandidateFilters;
  onChange: (next: CandidateFilters) => void;
}) {
  function toggle(chip: Chip) {
    if (chip.isActive(value)) {
      // limpiar solo las claves que controla este chip (a su default vacío)
      const reset = {} as Partial<CandidateFilters>;
      for (const k of Object.keys(chip.patch) as (keyof CandidateFilters)[]) {
        (reset as Record<string, unknown>)[k] = emptyCandidateFilters[k];
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
