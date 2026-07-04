const STEPS = [
  {
    number: 1,
    title: "Creás una búsqueda",
    description: 'Ejemplo: "Cajero turno tarde". Puesto, zona, sueldo y lo que necesitás — menos de 2 minutos.',
  },
  {
    number: 2,
    title: "Se publica sola",
    description:
      "Aparece al toque en tucv.ar y te damos un QR para compartir por WhatsApp, Instagram o imprimir y pegar en el local.",
  },
  {
    number: 3,
    title: "Filtrás y elegís",
    description:
      "Recibís las postulaciones ordenadas por zona, experiencia, disponibilidad y movilidad. ¿Necesitás ir más rápido? Promocioná la búsqueda y aparecé primero.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-4 py-14 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Cómo funciona</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="text-center sm:text-left p-5 rounded-[var(--tucv-radius)]"
              style={{
                backgroundColor: i === 1 ? "var(--tucv-primary)" : "var(--tucv-surface)",
                border: "2.5px solid var(--tucv-border)",
                boxShadow: "4px 4px 0 var(--tucv-border)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-lg mb-4 mx-auto sm:mx-0"
                style={
                  i === 1
                    ? { backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)", border: "2.5px solid var(--tucv-border)" }
                    : { backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "2.5px solid var(--tucv-border)" }
                }
              >
                {step.number}
              </div>
              <h3
                className="font-extrabold text-lg mb-1.5"
                style={{ color: i === 1 ? "var(--tucv-primary-text)" : "var(--tucv-text)" }}
              >
                {step.title}
              </h3>
              <p className="text-sm" style={{ color: i === 1 ? "var(--tucv-primary-text)" : "var(--tucv-muted)", opacity: i === 1 ? 0.92 : 1 }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
