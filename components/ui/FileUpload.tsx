"use client";

import { useRef } from "react";

export function FileUpload({
  accept,
  fileName,
  onFileSelected,
}: {
  accept: string;
  fileName: string | null;
  onFileSelected: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-sm font-semibold px-4 py-2 rounded-[var(--tucv-radius)] border shrink-0"
        style={{ borderColor: "var(--tucv-border)", color: "var(--tucv-text)" }}
      >
        {fileName ? "Cambiar archivo" : "Elegir archivo"}
      </button>
      <span className="text-sm truncate" style={{ color: "var(--tucv-muted)" }}>
        {fileName ?? "Ningún archivo seleccionado"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
