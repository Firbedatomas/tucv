"use client";

import { useLayoutEffect, useRef } from "react";
import { formatThousandsWithCursor } from "@/lib/format";

// Input con separador de miles en vivo. El truco del cursor tiene que pasar
// en dos tiempos: calculamos la posición en el onChange, pero recién la
// aplicamos en un useLayoutEffect (después de que React ya escribió el
// valor formateado en el DOM). Mutar `input.value` a mano DENTRO del propio
// onChange (antes de que React re-renderice) pelea con el value-tracker
// interno que React usa en los inputs controlados -- probado con Playwright
// tipeando rápido: el valor terminaba corrompido tipo "8.9 a 0" en vez de
// "800.000 a 900.000".
export function ThousandsInput({
  value,
  onChange,
  className,
  style,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursorRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(pendingCursorRef.current, pendingCursorRef.current);
      pendingCursorRef.current = null;
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawCursor = e.target.selectionStart ?? e.target.value.length;
    const { formatted, cursor } = formatThousandsWithCursor(e.target.value, rawCursor);
    pendingCursorRef.current = cursor;
    onChange(formatted);
  }

  return (
    <input
      ref={inputRef}
      className={className}
      style={style}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode="decimal"
    />
  );
}
