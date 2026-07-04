"use client";

import { useState } from "react";

// Estados del mini-CRM: guardar un candidato del directorio y seguirlo por el
// pipeline. Orden = avance real del proceso, por eso el select los muestra así.
export const SAVED_STATUSES = ["guardado", "contactado", "entrevistado", "descartado"] as const;
export type SavedStatus = (typeof SAVED_STATUSES)[number];

const STATUS_LABEL: Record<SavedStatus, string> = {
  guardado: "Guardado",
  contactado: "Contactado",
  entrevistado: "Entrevistado",
  descartado: "Descartado",
};

export type SavedRecord = { id: string; status: SavedStatus; note: string };

export function SavedCandidateControls({
  saved,
  expanded,
  onSave,
  onStatus,
  onNote,
  onRemove,
}: {
  saved: SavedRecord | null;
  expanded: boolean;
  onSave: () => void;
  onStatus: (status: SavedStatus) => void;
  onNote: (note: string) => void;
  onRemove: () => void;
}) {
  // La nota se edita localmente y se persiste al salir del campo, para no
  // pegarle a PocketBase en cada tecla.
  const [noteDraft, setNoteDraft] = useState(saved?.note ?? "");

  if (!saved) {
    // Acción secundaria (outline), no compite con "Contactar": guardar es un
    // gesto de bajo compromiso.
    return (
      <button
        type="button"
        onClick={onSave}
        className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] border"
        style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
      >
        Guardar
      </button>
    );
  }

  return (
    <>
      <select
        value={saved.status}
        onChange={(e) => onStatus(e.target.value as SavedStatus)}
        className="text-xs font-semibold px-2 py-1.5 rounded-[var(--tucv-radius)] border"
        style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)", backgroundColor: "var(--tucv-bg)" }}
        aria-label="Estado del candidato guardado"
      >
        {SAVED_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      {expanded && (
        <div className="w-full mt-2">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => {
              if (noteDraft !== saved.note) onNote(noteDraft);
            }}
            placeholder="Nota interna (solo la ve tu equipo)"
            rows={2}
            maxLength={2000}
            className="w-full text-sm px-3 py-2 rounded-[var(--tucv-radius)] border"
            style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)", backgroundColor: "var(--tucv-surface, #fff)" }}
          />
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold mt-1"
            style={{ color: "var(--tucv-muted)" }}
          >
            Quitar de guardados
          </button>
        </div>
      )}
    </>
  );
}
