import { HeroVisual } from "@/components/landing/HeroVisual";
import { EmpresaSteps } from "@/components/landing/EmpresaSteps";
import { CandidatesPreview } from "@/components/landing/CandidatesPreview";
import { LiveJobsFeed } from "@/components/landing/LiveJobsFeed";
import { LiveActivity } from "@/components/landing/LiveActivity";
import { ContextCTA } from "@/components/landing/ContextCTA";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { ScrollDepthTracker } from "@/components/analytics/ScrollDepthTracker";

// Home orientada a EMPRESA (el que paga): hero de negocio + cómo funciona +
// prueba real (candidatos) + búsquedas activas + pulso compacto + CTA. El
// contenido largo (comparativa, rubros, dos-caminos) vive en /radar para no
// alargar la landing.
export default function LandingPage() {
  return (
    <main className="flex-1">
      <ScrollDepthTracker />

      {/* 1. Hero empresa */}
      <section className="px-4 pt-6 pb-6 sm:pt-8 sm:pb-8" style={{ backgroundColor: "var(--tucv-text)" }}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-5 lg:gap-8 items-center">
          <div className="text-center lg:text-left">
            <p
              className="inline-block text-xs font-bold tracking-wide uppercase mb-3 px-3 py-1.5 rounded-[var(--tucv-radius)] -rotate-2"
              style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "2px solid var(--tucv-border)", boxShadow: "3px 3px 0 var(--tucv-border)" }}
            >
              Donde hay laburo, TuCV late.
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 text-balance" style={{ color: "var(--tucv-bg)" }}>
              Cubrí el puesto rápido,{" "}
              <span className="inline-block px-2 rotate-1" style={{ backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)" }}>
                sin vueltas
              </span>
              .
            </h1>
            <p className="text-base sm:text-lg mb-5" style={{ color: "#C9C1B4" }}>
              Publicá una búsqueda, compartí un QR y recibí perfiles claros por zona, experiencia y
              disponibilidad.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <TrackedLinkButton href="/empresa/busquedas/nueva" event="crear_busqueda" eventProps={{ source: "hero" }}>
                Publicar búsqueda gratis
              </TrackedLinkButton>
              <TrackedLinkButton href="/postulantes" event="ver_candidatos" eventProps={{ source: "hero" }} variant="secondary">
                Ver candidatos cerca
              </TrackedLinkButton>
            </div>
            <p className="text-xs mt-3" style={{ color: "#948B7E" }}>
              ✓ Comercio, servicios, limpieza, depósito, reparto, construcción, cuidado, ventas,
              administración, gastronomía y oficios.
            </p>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* 2. Cómo funciona (empresa) */}
      <EmpresaSteps />

      {/* 3. Candidatos visibles cerca / prueba real */}
      <CandidatesPreview />

      {/* 4. Búsquedas activas reales */}
      <LiveJobsFeed />

      {/* 5. TuCV late ahora (compacto) */}
      <LiveActivity compact />

      {/* 6. CTA final */}
      <ContextCTA
        title="Empezá gratis, hoy"
        subtitle="Sin costo, sin CVs sueltos. Cubrí el puesto o conseguí trabajo cerca tuyo."
        ctas={[
          { label: "Publicar búsqueda gratis", href: "/empresa/busquedas/nueva", event: "crear_busqueda", eventProps: { source: "final_home" } },
          { label: "Crear mi perfil gratis", href: "/postulante/nuevo", event: "crear_perfil", variant: "secondary", eventProps: { source: "final_home" } },
        ]}
      />
    </main>
  );
}
