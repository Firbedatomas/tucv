import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";

type Cta = {
  label: string;
  href: string;
  event: string;
  variant?: "primary" | "secondary";
  eventProps?: Record<string, string | number | boolean>;
};

// Banda de CTA contextual reusable (mismo ADN: card blanca, borde negro, sombra
// dura). Se intercala entre secciones de la home para dar próximos pasos claros.
export function ContextCTA({
  title,
  subtitle,
  ctas,
}: {
  title: string;
  subtitle?: string;
  ctas: Cta[];
}) {
  return (
    <section className="px-4 py-8">
      <div
        className="max-w-4xl mx-auto p-6 sm:p-8 rounded-[var(--tucv-radius)] text-center"
        style={{
          backgroundColor: "var(--tucv-surface)",
          border: "2.5px solid var(--tucv-border)",
          boxShadow: "4px 4px 0 var(--tucv-border)",
        }}
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--tucv-text)" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm mb-5" style={{ color: "var(--tucv-muted)" }}>
            {subtitle}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {ctas.map((c) => (
            <TrackedLinkButton
              key={c.event + c.href}
              href={c.href}
              event={c.event}
              eventProps={c.eventProps}
              variant={c.variant}
            >
              {c.label}
            </TrackedLinkButton>
          ))}
        </div>
      </div>
    </section>
  );
}
