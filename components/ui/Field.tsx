export function Field({
  label,
  hint,
  error,
  required,
  fieldKey,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Ancla para llevar la vista acá si este campo queda con error al
   * intentar enviar el formulario (ver handleSubmit en CandidateForm). */
  fieldKey?: string;
  children: React.ReactNode;
}) {
  // Div, no <label>: varios Field envuelven grupos de <button> (chips), y
  // anidar controles interactivos dentro de un <label> real rompe el cálculo
  // del nombre accesible en Chrome (además de ser HTML inválido).
  return (
    <div className="block mb-4" data-field={fieldKey}>
      <span className="block text-sm font-medium mb-1" style={{ color: "var(--tucv-text)" }}>
        {label}
        {required && <span style={{ color: "var(--tucv-accent)" }}> *</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="block text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
          {hint}
        </span>
      )}
      {error && (
        <span className="block text-xs mt-1 font-medium" style={{ color: "#DC2626" }}>
          {error}
        </span>
      )}
    </div>
  );
}

export const inputClass =
  "w-full px-3 py-2.5 text-base rounded-[var(--tucv-radius)] border-2 outline-none focus:ring-2";
export const inputStyle: React.CSSProperties = {
  borderColor: "var(--tucv-border)",
  backgroundColor: "var(--tucv-surface)",
  color: "var(--tucv-text)",
};
