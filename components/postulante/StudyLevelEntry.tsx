"use client";

import { STUDY_STATUS } from "@/lib/constants";
import { inputClass, inputStyle } from "@/components/ui/Field";

export type StudyLevelValue = {
  status: string;
  institution: string;
};

export const emptyStudyLevel: StudyLevelValue = {
  status: "",
  institution: "",
};

export function StudyLevelEntryField({
  value,
  onChange,
}: {
  value: StudyLevelValue;
  onChange: (next: StudyLevelValue) => void;
}) {
  function set<K extends keyof StudyLevelValue>(key: K, v: StudyLevelValue[K]) {
    onChange({ ...value, [key]: v });
  }

  const smallInput = `${inputClass} text-sm py-2`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1.5">
        {STUDY_STATUS.map((opt) => {
          const active = value.status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => set("status", active ? "" : opt.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border-2 transition"
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
      <input
        className={smallInput}
        style={{ ...inputStyle, minWidth: "160px", flex: 1 }}
        value={value.institution}
        onChange={(e) => set("institution", e.target.value)}
        placeholder="Institución (opcional)"
      />
    </div>
  );
}
