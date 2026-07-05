import { LinkButton } from "@/components/ui/Button";
import { LiveActivity } from "@/components/landing/LiveActivity";
import { ZoneJobCard } from "@/components/zonas/ZoneJobCard";
import type { PublicApiJob } from "@/lib/public-api";

// Cuerpo compartido de /trabajo/[city] y /trabajo/[city]/[category]. La
// diferencia entre las dos rutas es sólo si viene categoryLabel, así que en
// vez de duplicar el layout las dos páginas arman los datos y delegan acá.
// Es server component (mejor para SEO): las únicas piezas cliente son
// LiveActivity y, dentro suyo, nada más.
export function ZoneJobsSection({
  citySlug,
  cityLabel,
  categoryLabel,
  jobs,
}: {
  citySlug: string;
  cityLabel: string;
  categoryLabel?: string;
  jobs: PublicApiJob[];
}) {
  const heading = categoryLabel ? `Trabajo de ${categoryLabel} en ${cityLabel}` : `Trabajo en ${cityLabel}`;
  const count = jobs.length;

  return (
    <main className="flex-1">
      <section className="px-4 pt-8 pb-8" style={{ backgroundColor: "var(--tucv-text)" }}>
        <div className="max-w-6xl mx-auto">
          <p
            className="inline-block text-xs font-bold tracking-wide uppercase mb-3 px-3 py-1.5 rounded-[var(--tucv-radius)] -rotate-2"
            style={{
              backgroundColor: "var(--tucv-accent)",
              color: "var(--tucv-text)",
              border: "2px solid var(--tucv-border)",
              boxShadow: "3px 3px 0 var(--tucv-border)",
            }}
          >
            {cityLabel}
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold mb-3 text-balance" style={{ color: "var(--tucv-bg)" }}>
            {heading}
          </h1>
          <p className="text-base sm:text-lg mb-5 max-w-2xl" style={{ color: "#C9C1B4" }}>
            {count > 0
              ? `${count} ${count === 1 ? "búsqueda activa" : "búsquedas activas"}${
                  categoryLabel ? ` de ${categoryLabel.toLowerCase()}` : ""
                } cerca tuyo. Postulate con un clic, sin CV por mail.`
              : `Todavía no hay búsquedas activas${
                  categoryLabel ? ` de ${categoryLabel.toLowerCase()}` : ""
                } en ${cityLabel}. Sé el primer negocio en publicar una.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/empresa/busquedas/nueva">Crear búsqueda</LinkButton>
            <LinkButton href={`/postulantes/${citySlug}`} variant="secondary">
              Ver postulantes de {cityLabel}
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="max-w-6xl mx-auto">
          {count > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <ZoneJobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div
              className="p-6 rounded-[var(--tucv-radius)] text-center"
              style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)", boxShadow: "var(--tucv-shadow)" }}
            >
              <p className="font-bold mb-1">Sin búsquedas activas por ahora</p>
              <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
                Publicá la primera y compartila con un QR en tu local.
              </p>
              <LinkButton href="/empresa/busquedas/nueva">Crear búsqueda</LinkButton>
            </div>
          )}
        </div>
      </section>

      <LiveActivity city={cityLabel} title={`Movimiento en ${cityLabel}`} />
    </main>
  );
}
