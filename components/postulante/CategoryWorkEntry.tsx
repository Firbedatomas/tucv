"use client";

import { useState } from "react";
import { inputClass, inputStyle } from "@/components/ui/Field";
import { BusinessAutocomplete } from "@/components/postulante/BusinessAutocomplete";

export type CategoryWorkValue = {
  noExperience: boolean;
  company: string;
  companyId: string;
  companyAddress: string;
  startYear: string;
  endYear: string;
  isCurrent: boolean;
  referenceName: string;
  referencePhone: string;
  referenceRole: string;
};

export const emptyCategoryWork: CategoryWorkValue = {
  noExperience: false,
  company: "",
  companyId: "",
  companyAddress: "",
  startYear: "",
  endYear: "",
  isCurrent: false,
  referenceName: "",
  referencePhone: "",
  referenceRole: "",
};

// Con años (no meses), no podemos distinguir 6-12 meses de "menos de 6" con
// precisión, así que ese bucket queda para cuando quede diferenciarlo bien.
// Si no completó "hasta" ni tildó "actualidad", asumimos que sigue
// trabajando ahí (más realista que asumir 0 años, y evita que el campo sea
// obligatorio para poder guardar el formulario).
export function computeExperienceBucket(entry: CategoryWorkValue, currentYear: number): string {
  if (entry.noExperience) return "sin_experiencia";
  const start = Number(entry.startYear);
  if (!start) return "sin_experiencia";
  const end = entry.isCurrent ? currentYear : Number(entry.endYear) || currentYear;
  const years = Math.max(0, end - start);
  if (years < 1) return "menos_6_meses";
  if (years < 3) return "1_a_3_anos";
  return "mas_3_anos";
}

export function CategoryWorkEntryField({
  value,
  onChange,
}: {
  value: CategoryWorkValue;
  onChange: (next: CategoryWorkValue) => void;
}) {
  const [showReferent, setShowReferent] = useState(
    Boolean(value.referenceName || value.referencePhone || value.referenceRole),
  );

  function set<K extends keyof CategoryWorkValue>(key: K, v: CategoryWorkValue[K]) {
    onChange({ ...value, [key]: v });
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => currentYear - i);
  const smallInput = `${inputClass} text-sm py-2`;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={value.noExperience}
          onChange={(e) => set("noExperience", e.target.checked)}
        />
        No tengo experiencia en este rubro
      </label>

      {!value.noExperience && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <BusinessAutocomplete
              value={value.company}
              companyId={value.companyId}
              onChange={(company, companyId) => onChange({ ...value, company, companyId })}
            />
            <input
              className={smallInput}
              style={inputStyle}
              value={value.companyAddress}
              onChange={(e) => set("companyAddress", e.target.value)}
              placeholder="Dirección (opcional)"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              className={smallInput}
              style={{ ...inputStyle, width: "auto" }}
              value={value.startYear}
              onChange={(e) => set("startYear", e.target.value)}
            >
              <option value="">Desde</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {!value.isCurrent && (
              <select
                className={smallInput}
                style={{ ...inputStyle, width: "auto" }}
                value={value.endYear}
                onChange={(e) => set("endYear", e.target.value)}
              >
                <option value="">Hasta</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
              <input
                type="checkbox"
                checked={value.isCurrent}
                onChange={(e) => set("isCurrent", e.target.checked)}
              />
              Actualidad
            </label>
          </div>

          {showReferent ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                className={smallInput}
                style={inputStyle}
                value={value.referenceName}
                onChange={(e) => set("referenceName", e.target.value)}
                placeholder="Referente"
              />
              <input
                className={smallInput}
                style={inputStyle}
                value={value.referencePhone}
                onChange={(e) => set("referencePhone", e.target.value)}
                placeholder="Teléfono"
              />
              <input
                className={smallInput}
                style={inputStyle}
                value={value.referenceRole}
                onChange={(e) => set("referenceRole", e.target.value)}
                placeholder="Puesto"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowReferent(true)}
              className="text-xs font-semibold"
              style={{ color: "var(--tucv-primary)" }}
            >
              + Agregar referente (opcional)
            </button>
          )}
        </>
      )}
    </div>
  );
}
