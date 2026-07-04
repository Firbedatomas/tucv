"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeVisibleMessage, htmlToPlainText } from "@/lib/sanitize-html";
import { inputClass, inputStyle } from "@/components/ui/Field";

// Valores reales en px (no el 1-7 de execCommand('fontSize'), que no mapea
// a un tamaño fijo y además "pega" el tamaño al estado de escritura general
// en vez de quedar acotado a lo seleccionado -- por eso se sentía que
// aplicar un tamaño no era predecible y había que tocarlo varias veces).
const FONT_SIZES = [
  { label: "Normal", value: "" },
  { label: "Grande", value: "22px" },
  { label: "Muy grande", value: "30px" },
];

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // onMouseDown+preventDefault, no onClick: un click normal primero
      // dispara blur/mousedown en el contentEditable y pierde la selección
      // de texto ANTES de que el botón llegue a ejecutar el comando --
      // terminaría aplicando negrita/etc. donde el cursor haya quedado, no
      // sobre lo que el usuario seleccionó.
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="text-sm font-semibold px-2.5 py-1.5 rounded-[var(--tucv-radius)] border-2 transition"
      style={{
        backgroundColor: active ? "var(--tucv-accent)" : "var(--tucv-surface)",
        color: "var(--tucv-text)",
        borderColor: "var(--tucv-border)",
      }}
    >
      {children}
    </button>
  );
}

const MAX_LENGTH = 4000;

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pendingRangeRef = useRef<Range | null>(null);
  const [length, setLength] = useState(() => htmlToPlainText(value).length);
  // El contentEditable es un DOM no controlado a propósito (como cualquier
  // input rico) -- solo pisamos su innerHTML cuando el valor viene de AFUERA
  // (ej. al cargar un borrador para editar), nunca en cada tecla, o el
  // cursor saltaría al principio en cada render.
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (ref.current && value !== lastExternalValue.current && value !== ref.current.innerHTML) {
      ref.current.innerHTML = value;
      lastExternalValue.current = value;
      setLength(htmlToPlainText(value).length);
    }
  }, [value]);

  function emit() {
    if (!ref.current) return;
    const html = sanitizeVisibleMessage(ref.current.innerHTML);
    const plain = htmlToPlainText(html);
    if (plain.length > MAX_LENGTH) return; // el guard de abajo ya evitó llegar acá en la mayoría de los casos
    lastExternalValue.current = html;
    setLength(plain.length);
    onChange(html);
  }

  function exec(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    ref.current?.focus();
    emit();
  }

  // Tamaño de fuente vía Range/Selection en vez de execCommand('fontSize'):
  // ese comando no acota el cambio a lo seleccionado, lo liga al estado de
  // "modo de edición" general -- por eso después de usarlo una vez, el
  // tamaño quedaba "pegado" para lo próximo que se escribía, y aplicar un
  // tamaño distinto sobre texto ya formateado requería tocarlo varias veces
  // hasta que se viera bien. Envolver la selección en un <span> con el
  // font-size puesto queda acotado exactamente a lo seleccionado, siempre.
  function applyFontSize(px: string) {
    const editor = ref.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const span = document.createElement("span");
    if (px) span.style.fontSize = px;
    try {
      range.surroundContents(span);
    } catch {
      // La selección cruza límites de nodos que surroundContents no puede
      // envolver de forma directa (ej. selección que abarca dos párrafos) --
      // extraer y reinsertar el contenido adentro del span sí funciona en
      // ese caso.
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }

    // Reseleccionar el span para que quede visualmente claro qué se acaba
    // de formatear, y para poder aplicar otro estilo encima sin perder el
    // lugar.
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.addRange(newRange);

    editor.focus();
    emit();
  }

  function handleBeforeInput(e: React.FormEvent<HTMLDivElement>) {
    // Bloquea ESCRIBIR más una vez alcanzado el máximo -- no corta lo que
    // ya hay (eso rompería el HTML a mitad de una etiqueta), solo impide
    // seguir agregando.
    if (length >= MAX_LENGTH) {
      e.preventDefault();
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <ToolbarButton label="Negrita" onClick={() => exec("bold")}>
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton label="Subrayado" onClick={() => exec("underline")}>
          <span className="underline">S</span>
        </ToolbarButton>
        <select
          aria-label="Tamaño de texto"
          className="text-sm font-semibold px-2 py-1.5 rounded-[var(--tucv-radius)] border-2"
          style={{ backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)", borderColor: "var(--tucv-border)" }}
          // La selección de texto en el editor se pierde apenas el foco pasa
          // acá (el <select> mismo necesita foco para abrir) -- por eso el
          // tamaño se aplica recién en onChange, guardando la selección
          // ANTES con onMouseDown no alcanza para un <select> nativo (a
          // diferencia de los botones de arriba). Guardamos el Range en el
          // mousedown y lo reusamos en el change.
          onMouseDown={() => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) pendingRangeRef.current = sel.getRangeAt(0).cloneRange();
          }}
          onChange={(e) => {
            const range = pendingRangeRef.current;
            if (range) {
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
            applyFontSize(e.target.value);
            e.target.value = "";
          }}
          defaultValue=""
        >
          <option value="" disabled>
            Tamaño
          </option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <ToolbarButton label="Alinear a la izquierda" onClick={() => exec("justifyLeft")}>
          ←
        </ToolbarButton>
        <ToolbarButton label="Centrar" onClick={() => exec("justifyCenter")}>
          ↔
        </ToolbarButton>
      </div>

      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onBeforeInput={handleBeforeInput}
        className={`${inputClass} rich-text-editable min-h-[100px]`}
        style={inputStyle}
        suppressContentEditableWarning
      />
      <p className="text-xs mt-1" style={{ color: length >= MAX_LENGTH ? "#DC2626" : "var(--tucv-muted)" }}>
        {length}/{MAX_LENGTH} caracteres
      </p>
    </div>
  );
}
