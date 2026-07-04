"use client";

import { useState } from "react";
import { inputClass, inputStyle } from "@/components/ui/Field";

export function TagInput({
  value,
  onChange,
  placeholder,
  addLabel = "Agregar",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className={inputClass}
          style={inputStyle}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="px-4 text-sm font-semibold rounded-[var(--tucv-radius)] shrink-0"
          style={{ backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)" }}
        >
          {addLabel}
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-[var(--tucv-radius)]"
              style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }}
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Quitar ${tag}`}
                style={{ color: "var(--tucv-muted)" }}
                className="hover:opacity-70"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
