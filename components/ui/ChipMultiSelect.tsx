"use client";

import type { Option } from "@/lib/constants";

export function ChipMultiSelect({
  options,
  value,
  onChange,
  max,
}: {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, v]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
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
