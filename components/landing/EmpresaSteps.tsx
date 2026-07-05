const STEPS = [
  { n: 1, title: "Publicás", desc: "Creá una búsqueda en 2 minutos: puesto, zona, sueldo y condiciones.", accent: "var(--tucv-primary)" },
  { n: 2, title: "Compartís el QR", desc: "Descargá el cartel con QR y pegalo en la vidriera, o mandalo por WhatsApp.", accent: "var(--tucv-accent)" },
  { n: 3, title: "Contactás", desc: "Recibís perfiles ordenados por zona, experiencia y disponibilidad. Escribís por WhatsApp.", accent: "#128C4A" },
];

// Cómo funciona, versión empresa compacta (Publicás -> Compartís QR ->
// Contactás). Mobile-first: 1 columna en celular, 3 en desktop.
export function EmpresaSteps() {
  return (
    <section className="px-4 py-10 sm:py-14">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Cómo funciona</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="p-5 rounded-[var(--tucv-radius)]"
              style={{ backgroundColor: "var(--tucv-surface)", border: "2.5px solid var(--tucv-border)", boxShadow: "4px 4px 0 var(--tucv-border)" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold mb-3"
                style={{ backgroundColor: s.accent, color: "var(--tucv-text)", border: "2px solid var(--tucv-border)" }}
              >
                {s.n}
              </div>
              <h3 className="font-extrabold text-lg mb-1" style={{ color: "var(--tucv-text)" }}>
                {s.title}
              </h3>
              <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
