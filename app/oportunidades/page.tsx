import type { Metadata } from "next";
import Link from "next/link";
import { listDetectedOpportunities } from "@/lib/sourced";
import { LinkButton } from "@/components/ui/Button";
import { LogoImg } from "@/components/sourced/LogoImg";
import { TrackView } from "@/components/TrackView";

export const metadata: Metadata = {
  title: "Oportunidades cerca tuyo — TuCV",
  description:
    "Empresas de tu zona que están buscando personal. Deciles que te interesa y te avisamos cuando entren a TuCV.",
};

// Lee de PocketBase en cada request (no se puede prerenderizar en build).
export const dynamic = "force-dynamic";

export default async function OportunidadesPage() {
  const opps = await listDetectedOpportunities();

  // Agrupamos por zona para que el candidato encuentre lo suyo rápido.
  const byZone = new Map<string, typeof opps>();
  for (const o of opps) {
    const z = o.cityZone || "Otras zonas";
    (byZone.get(z) ?? byZone.set(z, []).get(z)!).push(o);
  }
  const zones = [...byZone.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <main className="flex-1 px-4 py-8 sm:py-12">
      <TrackView event="oportunidades_ver" />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Oportunidades cerca tuyo</h1>
        <p className="text-sm mb-2" style={{ color: "var(--tucv-muted)" }}>
          Empresas que detectamos buscando personal. Todavía no administran su búsqueda en TuCV —
          si te interesa, les avisamos que hay gente de tu zona esperando.
        </p>

        {opps.length === 0 ? (
          <div className="rounded-[var(--tucv-radius)] px-4 py-6 text-sm text-center mt-6" style={{ border: "2px solid var(--tucv-border)", color: "var(--tucv-muted)" }}>
            Todavía no hay oportunidades cargadas. Volvé pronto.
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {zones.map(([zone, list]) => (
              <section key={zone}>
                <h2 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
                  {zone} · {list.length}
                </h2>
                <div className="space-y-2">
                  {list.map((o) => (
                    <Link
                      key={o.jobId}
                      href={`/e/${o.businessSlug}`}
                      className="flex items-center gap-3 rounded-[var(--tucv-radius)] px-4 py-3"
                      style={{ border: "2px solid var(--tucv-border)", backgroundColor: "var(--tucv-surface)" }}
                    >
                      <LogoImg src={o.logoUrl} name={o.businessName} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{o.businessName}</p>
                        <p className="text-sm truncate" style={{ color: "var(--tucv-muted)" }}>
                          {o.role}
                          {o.rubro ? ` · ${o.rubro}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }}>
                        Me interesa →
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-[var(--tucv-radius)] px-4 py-4" style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}>
          <p className="text-sm font-semibold mb-1">¿Todavía no tenés tu perfil?</p>
          <p className="text-sm mb-3" style={{ color: "var(--tucv-muted)" }}>
            Crealo una vez y cuando una de estas empresas entre a TuCV, te contactan directo.
          </p>
          <LinkButton href="/postulante/nuevo">Crear mi perfil gratis</LinkButton>
        </div>
      </div>
    </main>
  );
}
