import { HeroVisual } from "@/components/landing/HeroVisual";
import { LiveActivity } from "@/components/landing/LiveActivity";
import { LiveJobsFeed } from "@/components/landing/LiveJobsFeed";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { CategoryChips } from "@/components/landing/CategoryChips";
import { AudienceCards } from "@/components/landing/AudienceCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ContextCTA } from "@/components/landing/ContextCTA";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { ScrollDepthTracker } from "@/components/analytics/ScrollDepthTracker";

const HERO_CTAS = [
  { label: "Crear búsqueda", href: "/empresa/busquedas/nueva", event: "click_crear_busqueda" as const },
  { label: "Crear mi perfil gratis", href: "/postulante/nuevo", event: "click_crear_perfil" as const },
] as const;

export default function LandingPage() {
  return (
    <main className="flex-1">
      <ScrollDepthTracker />
      <section className="px-4 pt-6 pb-6 sm:pt-8 sm:pb-8" style={{ backgroundColor: "var(--tucv-text)" }}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-5 lg:gap-8 items-center">
          <div className="text-center lg:text-left">
            <p
              className="inline-block text-xs font-bold tracking-wide uppercase mb-3 px-3 py-1.5 rounded-[var(--tucv-radius)] -rotate-2"
              style={{
                backgroundColor: "var(--tucv-accent)",
                color: "var(--tucv-text)",
                border: "2px solid var(--tucv-border)",
                boxShadow: "3px 3px 0 var(--tucv-border)",
              }}
            >
              Donde hay laburo, TuCV late.
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 text-balance" style={{ color: "var(--tucv-bg)" }}>
              Cubrí el puesto rápido,{" "}
              <span
                className="inline-block px-2 rotate-1"
                style={{ backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)" }}
              >
                sin vueltas
              </span>
              .
            </h1>
            <p className="text-base sm:text-lg mb-5" style={{ color: "#C9C1B4" }}>
              Candidatos reales de cercanía, sin CVs sueltos por mail. Creá una búsqueda, compartí
              un QR y recibí perfiles claros por zona, experiencia y disponibilidad.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <TrackedLinkButton href={HERO_CTAS[0].href} event={HERO_CTAS[0].event} eventProps={{ source: "hero" }}>
                Crear búsqueda
              </TrackedLinkButton>
              <TrackedLinkButton
                href={HERO_CTAS[1].href}
                event={HERO_CTAS[1].event}
                eventProps={{ source: "hero" }}
                variant="secondary"
              >
                Busco trabajo
              </TrackedLinkButton>
            </div>
            <p className="text-xs mt-3" style={{ color: "#948B7E" }}>
              ✓ Para comercio, servicios, limpieza, depósito, reparto, construcción, cuidado,
              ventas, administración, gastronomía y oficios.
            </p>
          </div>

          <HeroVisual />
        </div>
      </section>

      <LiveActivity />
      <LiveJobsFeed />
      <ContextCTA
        title="¿Buscás trabajo o buscás gente?"
        subtitle="Empezá gratis: publicá una búsqueda o cargá tu perfil en 2 minutos."
        ctas={[
          { label: "Publicar búsqueda gratis", href: "/empresa/busquedas/nueva", event: "click_crear_busqueda", eventProps: { source: "post_busquedas" } },
          { label: "Crear mi perfil gratis", href: "/postulante/nuevo", event: "click_crear_perfil", variant: "secondary", eventProps: { source: "post_busquedas" } },
        ]}
      />
      <BeforeAfter />
      <CategoryChips />
      <AudienceCards />
      <HowItWorks />
      <ContextCTA
        title="Empezá gratis, hoy"
        subtitle="Sin costo, sin CVs sueltos. Cubrí el puesto o conseguí trabajo cerca tuyo."
        ctas={[
          { label: "Publicar búsqueda gratis", href: "/empresa/busquedas/nueva", event: "click_crear_busqueda", eventProps: { source: "final_home" } },
          { label: "Crear mi perfil gratis", href: "/postulante/nuevo", event: "click_crear_perfil", variant: "secondary", eventProps: { source: "final_home" } },
        ]}
      />
    </main>
  );
}
