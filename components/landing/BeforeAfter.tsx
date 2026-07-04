const AFTER_ROWS = [
  { name: "Sofía", zone: "Centro", exp: "2 años", available: "Tarde", status: "Contactar" },
  { name: "Lucas", zone: "Alberdi", exp: "6 meses", available: "Full time", status: "Nuevo" },
  { name: "Carla", zone: "Nueva Córdoba", exp: "3 años", available: "Mañana", status: "Entrevista" },
];

export function BeforeAfter() {
  return (
    <section className="px-4 py-14 sm:py-20">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 items-stretch">
        <div
          className="rounded-[var(--tucv-radius)] p-5 sm:p-6"
          style={{
            backgroundColor: "var(--tucv-surface)",
            border: "2px solid var(--tucv-border)",
            boxShadow: "var(--tucv-shadow)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#DC2626" }}>
            Antes
          </p>
          <h3 className="font-bold mb-4">Los CVs llegan mezclados por todos lados.</h3>
          <div className="space-y-2 text-sm">
            <div className="rounded-[var(--tucv-radius)] px-3 py-2" style={{ backgroundColor: "var(--tucv-bg)" }}>
              <span className="truncate">CV_Juan_final.pdf</span>
            </div>
            <div
              className="rounded-[var(--tucv-radius)] px-3 py-2 self-start max-w-[80%]"
              style={{ backgroundColor: "#DCF8C6" }}
            >
              <span>Hola, te dejo mi CV</span>
            </div>
            <div className="rounded-[var(--tucv-radius)] px-3 py-2" style={{ backgroundColor: "var(--tucv-bg)" }}>
              <span>Foto de un CV en papel, medio borrosa</span>
            </div>
            <div className="rounded-[var(--tucv-radius)] px-3 py-2" style={{ backgroundColor: "var(--tucv-bg)" }}>
              <span>&quot;Busco laburo&quot; en un comentario de Instagram</span>
            </div>
          </div>
          <p className="text-sm mt-4" style={{ color: "var(--tucv-muted)" }}>
            Después hay que abrirlos uno por uno para ver si sirven.
          </p>
        </div>

        <div
          className="rounded-[var(--tucv-radius)] p-5 sm:p-6"
          style={{
            backgroundColor: "var(--tucv-surface)",
            border: "2px solid var(--tucv-border)",
            boxShadow: "var(--tucv-shadow)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--tucv-primary)" }}>
            Ahora con TuCV
          </p>
          <h3 className="font-bold mb-4">Cada postulación es una ficha clara y filtrable.</h3>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs sm:text-sm min-w-[380px]">
              <thead>
                <tr className="text-left" style={{ color: "var(--tucv-muted)" }}>
                  <th className="font-medium pb-2">Nombre</th>
                  <th className="font-medium pb-2">Zona</th>
                  <th className="font-medium pb-2">Exp.</th>
                  <th className="font-medium pb-2">Disponible</th>
                  <th className="font-medium pb-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {AFTER_ROWS.map((row) => (
                  <tr key={row.name} style={{ borderTop: "1px solid var(--tucv-border)" }}>
                    <td className="py-2 font-semibold">{row.name}</td>
                    <td className="py-2" style={{ color: "var(--tucv-muted)" }}>{row.zone}</td>
                    <td className="py-2" style={{ color: "var(--tucv-muted)" }}>{row.exp}</td>
                    <td className="py-2" style={{ color: "var(--tucv-muted)" }}>{row.available}</td>
                    <td className="py-2">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-[var(--tucv-radius)]"
                        style={{
                          backgroundColor: "var(--tucv-accent)",
                          color: "var(--tucv-text)",
                          border: "1.5px solid var(--tucv-border)",
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm mt-4" style={{ color: "var(--tucv-muted)" }}>
            Filtrás por zona, experiencia y disponibilidad. Sin abrir un solo archivo.
          </p>
        </div>
      </div>
    </section>
  );
}
