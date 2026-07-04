"use client";

import { useRef } from "react";
import Image from "next/image";

export function PhotoUpload({
  previewUrl,
  onFileSelected,
  processing,
}: {
  previewUrl: string | null;
  onFileSelected: (file: File | null) => void;
  processing?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
        style={{
          backgroundColor: "var(--tucv-bg)",
          border: previewUrl ? "1px solid var(--tucv-border)" : "2px dashed var(--tucv-border)",
        }}
        aria-label={previewUrl ? "Cambiar foto" : "Subir foto"}
      >
        {previewUrl ? (
          <Image src={previewUrl} alt="Foto de perfil" fill unoptimized className="object-cover" />
        ) : (
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--tucv-muted)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h1.79a1 1 0 0 0 .83-.45l.87-1.3a1 1 0 0 1 .83-.45h4.36a1 1 0 0 1 .83.45l.87 1.3a1 1 0 0 0 .83.45H18.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
            <circle cx="12" cy="13" r="3.4" />
          </svg>
        )}
        {processing && (
          <div
            className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-center px-1"
            style={{ backgroundColor: "rgba(255,255,255,0.85)", color: "var(--tucv-text)" }}
          >
            Procesando...
          </div>
        )}
      </button>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm font-semibold"
          style={{ color: "var(--tucv-primary)" }}
        >
          {previewUrl ? "Cambiar foto" : "Subir foto"}
        </button>
        <p className="text-xs mt-0.5" style={{ color: "var(--tucv-muted)" }}>
          Opcional. Se achica automáticamente antes de subirla.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
