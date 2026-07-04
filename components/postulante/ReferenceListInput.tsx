"use client";

import { useState } from "react";
import { inputClass, inputStyle } from "@/components/ui/Field";

export type ReferenceValue = { name: string; relation: string; phone: string };

// Reemplaza el viejo TagInput de una sola línea (nombre + relación +
// teléfono todo mezclado en un texto libre) por 3 campos chicos que se van
// agregando de a una referencia por vez -- mismo patrón que ya se usó para
// "estudios": elegir/completar en vez de escribir todo junto.
export function ReferenceListInput({
  value,
  onChange,
}: {
  value: ReferenceValue[];
  onChange: (next: ReferenceValue[]) => void;
}) {
  const [draft, setDraft] = useState<ReferenceValue>({ name: "", relation: "", phone: "" });
  const smallInput = `${inputClass} text-sm py-2`;

  function add() {
    if (!draft.name.trim()) return;
    onChange([...value, { name: draft.name.trim(), relation: draft.relation.trim(), phone: draft.phone.trim() }]);
    setDraft({ name: "", relation: "", phone: "" });
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {value.map((ref, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 text-sm rounded-[var(--tucv-radius)] px-3 py-2"
          style={{ backgroundColor: "var(--tucv-bg)" }}
        >
          <span className="min-w-0 truncate">
            <span className="font-semibold">{ref.name}</span>
            {ref.relation && <span style={{ color: "var(--tucv-muted)" }}> · {ref.relation}</span>}
            {ref.phone && <span style={{ color: "var(--tucv-muted)" }}> · {ref.phone}</span>}
          </span>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-xs font-semibold shrink-0"
            style={{ color: "var(--tucv-muted)" }}
          >
            Quitar
          </button>
        </div>
      ))}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          className={smallInput}
          style={inputStyle}
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Nombre"
        />
        <input
          className={smallInput}
          style={inputStyle}
          value={draft.relation}
          onChange={(e) => setDraft((d) => ({ ...d, relation: e.target.value }))}
          placeholder="Dónde te conoce"
        />
        <input
          className={smallInput}
          style={inputStyle}
          value={draft.phone}
          onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
          placeholder="Teléfono (opcional)"
        />
      </div>
      <button
        type="button"
        onClick={add}
        disabled={!draft.name.trim()}
        className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] disabled:opacity-40"
        style={{ backgroundColor: "var(--tucv-primary)", color: "#fff" }}
      >
        + Agregar referencia
      </button>
    </div>
  );
}
