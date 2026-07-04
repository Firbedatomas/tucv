const DISPLAY_CATEGORIES = [
  "Comercio",
  "Limpieza",
  "Depósito",
  "Reparto",
  "Construcción",
  "Cuidado",
  "Seguridad",
  "Ventas",
  "Atención",
  "Talleres",
  "Producción",
  "Administración",
  "Gastronomía",
  "Hotelería",
  "Oficios",
];

export function CategoryChips() {
  return (
    <section className="px-4 py-14 sm:py-20 text-center">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Para trabajos reales de cercanía</h2>
        <p className="text-sm sm:text-base mb-8" style={{ color: "var(--tucv-muted)" }}>
          No es LinkedIn. No es un portal corporativo. Es para personas que buscan laburo y
          empleadores que necesitan contratar rápido.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {DISPLAY_CATEGORIES.map((label) => (
            <span
              key={label}
              className="text-sm px-3 py-1.5 rounded-[var(--tucv-radius)]"
              style={{
                backgroundColor: "var(--tucv-surface)",
                border: "1.5px solid var(--tucv-border)",
                boxShadow: "var(--tucv-shadow)",
                color: "var(--tucv-text)",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
