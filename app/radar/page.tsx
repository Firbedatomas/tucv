import type { Metadata } from "next";
import { LiveActivity } from "@/components/landing/LiveActivity";
import { LiveJobsFeed } from "@/components/landing/LiveJobsFeed";
import { CandidatesPreview } from "@/components/landing/CandidatesPreview";
import { CategoryChips } from "@/components/landing/CategoryChips";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { ContextCTA } from "@/components/landing/ContextCTA";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { ScrollDepthTracker } from "@/components/analytics/ScrollDepthTracker";

export const metadata: Metadata = {
  title: "TuCV late ahora — actividad real",
  description:
    "Movimiento real de TuCV: perfiles visibles, búsquedas activas y actividad reciente por zona y rubro. Datos reales, sin inventar.",
  alternates: { canonical: "/radar" },
};

// Página pública "TuCV late ahora" (/radar): la prueba viva del producto, con
// el contenido más largo que sacamos de la home para acortarla. Todo dato real
// (contadores, actividad, perfiles, búsquedas). Sin login para mirar.
export default function RadarPage() {
  return (
    <main className="flex-1">
      <PageViewTracker event="view_radar" />
      <ScrollDepthTracker />

      <section className="px-4 pt-8 pb-2" style={{ backgroundColor: "var(--tucv-text)" }}>
        <div className="max-w-6xl mx-auto text-center">
          <p
            className="inline-block text-xs font-bold uppercase tracking-wide mb-3 px-3 py-1.5 rounded-[var(--tucv-radius)] -rotate-2"
            style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)", boxShadow: "3px 3px 0 var(--tucv-border)" }}
          >
            TuCV late ahora
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2" style={{ color: "var(--tucv-bg)" }}>
            El pulso real de TuCV
          </h1>
          <p className="text-sm sm:text-base mb-6" style={{ color: "#C9C1B4" }}>
            Números y movimiento reales, sin inflar. Estamos en beta y arrancando: lo que ves acá es
            de verdad.
          </p>
        </div>
      </section>

      <LiveActivity />
      <CandidatesPreview />
      <LiveJobsFeed />
      <CategoryChips />
      <BeforeAfter />
      <ContextCTA
        title="¿Y vos? Sumate al movimiento"
        subtitle="Publicá una búsqueda o cargá tu perfil en 2 minutos, gratis."
        ctas={[
          { label: "Publicar búsqueda gratis", href: "/empresa/busquedas/nueva", event: "crear_busqueda", eventProps: { source: "radar" } },
          { label: "Crear mi perfil gratis", href: "/postulante/nuevo", event: "crear_perfil", variant: "secondary", eventProps: { source: "radar" } },
        ]}
      />
    </main>
  );
}
