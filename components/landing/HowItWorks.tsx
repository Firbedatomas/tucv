import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";

type Path = {
  eyebrow: string;
  title: string;
  accent: string; // color de la barra/números
  steps: string[];
  cta: { label: string; href: string; event: string };
};

const PATHS: Path[] = [
  {
    eyebrow: "Soy comercio",
    title: "Cubrí el puesto sin CVs sueltos",
    accent: "var(--tucv-primary)",
    steps: [
      "Creás una búsqueda en menos de 2 minutos.",
      "Descargás e imprimís el cartel con QR para pegar en la vidriera.",
      "Recibís postulantes ordenados por zona, experiencia y disponibilidad.",
    ],
    cta: { label: "Publicar búsqueda gratis", href: "/empresa/busquedas/nueva", event: "click_crear_busqueda" },
  },
  {
    eyebrow: "Busco trabajo",
    title: "Que los comercios de tu zona te encuentren",
    accent: "var(--tucv-accent)",
    steps: [
      "Creás tu perfil una vez: zona, experiencia y disponibilidad.",
      "Aparecés visible para los comercios que buscan cerca tuyo.",
      "Compartís tu perfil por WhatsApp para que te vean más.",
    ],
    cta: { label: "Crear mi perfil gratis", href: "/postulante/nuevo", event: "click_crear_perfil" },
  },
];

export function HowItWorks() {
  return (
    <section className="px-4 py-14 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Mirá cómo funciona</h2>
        <p className="text-sm text-center mb-10" style={{ color: "var(--tucv-muted)" }}>
          Dos caminos, el mismo lugar. Elegí el tuyo.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          {PATHS.map((path) => (
            <div
              key={path.eyebrow}
              className="flex flex-col p-5 sm:p-6 rounded-[var(--tucv-radius)]"
              style={{
                backgroundColor: "var(--tucv-surface)",
                border: "2.5px solid var(--tucv-border)",
                boxShadow: "4px 4px 0 var(--tucv-border)",
              }}
            >
              <div className="w-12 h-2 mb-4" style={{ backgroundColor: path.accent }} />
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--tucv-muted)" }}>
                {path.eyebrow}
              </p>
              <h3 className="font-extrabold text-lg mb-5" style={{ color: "var(--tucv-text)" }}>
                {path.title}
              </h3>

              <ol className="space-y-3 mb-6 flex-1">
                {path.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-sm"
                      style={{
                        backgroundColor: path.accent,
                        color: "var(--tucv-text)",
                        border: "2px solid var(--tucv-border)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm pt-0.5" style={{ color: "var(--tucv-text)" }}>
                      {step}
                    </span>
                  </li>
                ))}
              </ol>

              <TrackedLinkButton
                href={path.cta.href}
                event={path.cta.event}
                eventProps={{ source: "como_funciona" }}
                variant={path.eyebrow === "Soy comercio" ? "primary" : "secondary"}
                className="w-full"
              >
                {path.cta.label}
              </TrackedLinkButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
