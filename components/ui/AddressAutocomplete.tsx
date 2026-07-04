"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass, inputStyle } from "@/components/ui/Field";

type Suggestion = { placeId: string; text: string };

export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  name,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  autoComplete?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  // Sin esto, un formulario de EDICIÓN que precarga `value` (ej. la zona ya
  // guardada del negocio) dispara el fetch y abre el dropdown de sugerencias
  // apenas monta, sin que la persona haya tocado el campo -- y encima queda
  // tapando cosas como el botón de guardar. Solo autocompletamos después de
  // una interacción real.
  const [touched, setTouched] = useState(false);
  // Lazy initializer de useState en vez de mutar un ref durante el render:
  // el linter de hooks rechaza escrituras a refs fuera de efectos/handlers
  // (rompe las garantías que necesita el React Compiler).
  const [sessionToken, setSessionToken] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : "",
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sin setState acá: si el valor es muy corto, el guard de abajo en el
    // JSX (value.trim().length >= 3) ya oculta sugerencias viejas sin
    // necesidad de limpiarlas desde el cuerpo del efecto.
    if (!touched || !value || value.trim().length < 3) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(
        `/api/places-autocomplete?input=${encodeURIComponent(value)}&sessiontoken=${sessionToken}`,
        { signal: controller.signal },
      )
        .then((res) => res.json())
        .then((data: { suggestions?: Suggestion[] }) => {
          const next = data.suggestions ?? [];
          setSuggestions(next);
          setOpen(next.length > 0);
          setHighlighted(-1);
        })
        .catch(() => {
          // Sin conexión, key sin cuota, etc.: el campo sigue siendo texto
          // libre, no rompemos el formulario por esto.
        });
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value, sessionToken, touched]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function select(s: Suggestion) {
    onChange(s.text);
    setSuggestions([]);
    setOpen(false);
    // Volvemos a "no tocado": sin esto, el cambio de `value` que acabamos de
    // disparar reactiva el efecto de búsqueda 300ms después, que vuelve a
    // pedirle a Google sugerencias para el texto ya completo (el mismo lugar
    // elegido) y reabre el dropdown con resultados casi idénticos -- se veía
    // como si la dirección "apareciera de nuevo" sola después de elegirla.
    setTouched(false);
    // Nueva sesión de billing para la próxima búsqueda (Google factura
    // autocomplete por sesión, de foco a selección).
    setSessionToken(typeof crypto !== "undefined" ? crypto.randomUUID() : "");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      select(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        className={inputClass}
        style={inputStyle}
        name={name}
        autoComplete={autoComplete ?? "off"}
        value={value}
        onChange={(e) => {
          setTouched(true);
          onChange(e.target.value);
        }}
        onFocus={() => {
          setTouched(true);
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {open && value.trim().length >= 3 && suggestions.length > 0 && (
        <ul
          className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-auto rounded-[var(--tucv-radius)]"
          style={{
            backgroundColor: "var(--tucv-surface)",
            border: "2px solid var(--tucv-border)",
            boxShadow: "var(--tucv-shadow)",
          }}
        >
          {suggestions.map((s, i) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm"
                style={{
                  backgroundColor: i === highlighted ? "var(--tucv-accent)" : "transparent",
                  color: "var(--tucv-text)",
                  borderTop: i > 0 ? "1.5px solid var(--tucv-border)" : undefined,
                }}
                onMouseEnter={() => setHighlighted(i)}
                // onMouseDown (con preventDefault) en vez de onClick: en
                // mobile, el tap dispara mousedown/blur en el input ANTES
                // que el click en el botón -- eso corre el listener de
                // "click afuera" primero, cierra el dropdown, y el click
                // nunca llega a dispararse (parece que la sugerencia "no
                // hace nada" al tocarla). preventDefault en mousedown evita
                // que el input pierda foco/dispare blur antes de elegir.
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(s);
                }}
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
