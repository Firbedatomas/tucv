import { LinkButton } from "@/components/ui/Button";

export function AudienceCards() {
  return (
    <section className="px-4 pb-14 sm:pb-20">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        {/* Postulante -- camino calmo, de-emphasizado a propósito: en TuCV la
            conversión que importa es la de la empresa (igual que en el hero,
            donde "Crear búsqueda" es el CTA primario). Card blanca = elevada
            sobre el crema del fondo, barra y acentos en amarillo (accent). */}
        <div
          className="rounded-[var(--tucv-radius)] p-6 sm:p-8"
          style={{
            backgroundColor: "var(--tucv-surface)",
            border: "2px solid var(--tucv-border)",
            boxShadow: "var(--tucv-shadow)",
          }}
        >
          <div className="w-10 h-2 mb-4" style={{ backgroundColor: "var(--tucv-accent)" }} />
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--tucv-muted)" }}>
            Buscás trabajo
          </p>
          <h3 className="text-xl font-bold mb-2" style={{ color: "var(--tucv-text)" }}>
            Cargá tu perfil una vez
          </h3>
          <p className="text-sm mb-5" style={{ color: "var(--tucv-muted)" }}>
            Nombre, WhatsApp, zona, experiencia, disponibilidad y rubros. Después podés
            postularte sin volver a llenar todo.
          </p>
          <LinkButton href="/postulante/nuevo" variant="secondary">
            Crear mi TuCV
          </LinkButton>
        </div>

        {/* Empresa -- el foco de la sección. Card oscura (mismo negro del hero)
            para que "pese" y se lea como lo importante, barra y acentos en
            naranja (primary), CTA primario. Distinta de la de postulante por
            fondo + color de acento, no por colores fuera de la paleta. */}
        <div
          className="rounded-[var(--tucv-radius)] p-6 sm:p-8"
          style={{
            backgroundColor: "var(--tucv-text)",
            border: "2px solid var(--tucv-border)",
            boxShadow: "var(--tucv-shadow)",
          }}
        >
          <div className="w-10 h-2 mb-4" style={{ backgroundColor: "var(--tucv-primary)" }} />
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--tucv-primary)" }}>
            Buscás empleados
          </p>
          <h3 className="text-xl font-bold mb-2" style={{ color: "var(--tucv-bg)" }}>
            Creá una búsqueda y compartí el QR
          </h3>
          <p className="text-sm mb-5" style={{ color: "#C9C1B4" }}>
            Pegalo en la vidriera, mandalo por WhatsApp o subilo a Instagram. Los postulantes
            llegan ordenados.
          </p>
          <LinkButton href="/empresa/busquedas/nueva">Crear búsqueda</LinkButton>
        </div>
      </div>
    </section>
  );
}
