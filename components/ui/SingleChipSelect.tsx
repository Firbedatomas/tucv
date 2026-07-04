"use client";

import type { Option } from "@/lib/constants";

// Como ChipMultiSelect pero de una sola opción a la vez (clickear la
// activa de nuevo la deselecciona) -- para elegir entre presets tipo "Lunes
// a viernes" / "Fines de semana", donde tiene sentido un solo valor.
export function SingleChipSelect({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? "" : opt.value)}
            className="text-sm px-3 py-1.5 rounded-[var(--tucv-radius)] border-2 transition"
            style={
              active
                ? { backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)", borderColor: "var(--tucv-border)" }
                : { backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)", borderColor: "var(--tucv-border)" }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
