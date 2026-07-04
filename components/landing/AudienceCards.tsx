import { LinkButton } from "@/components/ui/Button";

export function AudienceCards() {
  return (
    <section className="px-4 pb-14 sm:pb-20">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        <div
          className="rounded-[var(--tucv-radius)] p-6 sm:p-8"
          style={{
            backgroundColor: "#D6E4FF",
            border: "2px solid var(--tucv-border)",
            boxShadow: "var(--tucv-shadow)",
          }}
        >
          <div className="w-10 h-1.5 rounded-full mb-4" style={{ backgroundColor: "#2563EB" }} />
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#2563EB" }}>
            Buscás trabajo
          </p>
          <h3 className="text-xl font-bold mb-2">Cargá tu perfil una vez</h3>
          <p className="text-sm mb-5" style={{ color: "var(--tucv-muted)" }}>
            Nombre, WhatsApp, zona, experiencia, disponibilidad y rubros. Después podés
            postularte sin volver a llenar todo.
          </p>
          <LinkButton href="/postulante/nuevo">Crear mi TuCV</LinkButton>
        </div>

        <div
          className="rounded-[var(--tucv-radius)] p-6 sm:p-8"
          style={{
            backgroundColor: "#CFF0D9",
            border: "2px solid var(--tucv-border)",
            boxShadow: "var(--tucv-shadow)",
          }}
        >
          <div className="w-10 h-1.5 rounded-full mb-4" style={{ backgroundColor: "#128C4A" }} />
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#128C4A" }}>
            Buscás empleados
          </p>
          <h3 className="text-xl font-bold mb-2">Creá una búsqueda y compartí el QR</h3>
          <p className="text-sm mb-5" style={{ color: "var(--tucv-muted)" }}>
            Pegalo en la vidriera, mandalo por WhatsApp o subilo a Instagram. Los postulantes
            llegan ordenados.
          </p>
          <LinkButton href="/empresa/busquedas/nueva" style={{ backgroundColor: "#128C4A" }}>
            Crear búsqueda
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
