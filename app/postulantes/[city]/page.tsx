import type { Metadata } from "next";
import { listPublicCandidates } from "@/lib/public-candidates-list";
import { LinkButton } from "@/components/ui/Button";
import { LiveActivity } from "@/components/landing/LiveActivity";
import { PostulanteCard } from "@/components/postulantes/PostulanteCard";
import { cityTextFromSlug, cityLabelFromSlug, zoneMatchesCity } from "@/components/zonas/city";

export const dynamic = "force-dynamic";

// Filtrado por ciudad en este código (no en public-candidates-list): traemos
// el directorio completo y nos quedamos con los que tienen la ciudad dentro
// de city_zone (substring, ignorando acentos y mayúsculas), igual criterio
// que las páginas de /trabajo.
async function candidatesForCity(cityText: string) {
  const { items } = await listPublicCandidates();
  return items.filter((c) => zoneMatchesCity(c.city_zone, cityText));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const cityLabel = cityLabelFromSlug(city);
  const title = `Postulantes en ${cityLabel}`;
  const description = `Gente de ${cityLabel} lista para laburar: rubro, zona y disponibilidad, sin necesidad de cuenta. Contactá candidatos de cercanía o creá tu propio perfil.`;
  return {
    title,
    description,
    alternates: { canonical: `/postulantes/${city}` },
    openGraph: { title: `${title} — TuCV`, description, url: `/postulantes/${city}`, type: "website" },
  };
}

export default async function PostulantesCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const cityText = cityTextFromSlug(city);
  const cityLabel = cityLabelFromSlug(city);
  const candidates = await candidatesForCity(cityText);
  const count = candidates.length;

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
            Postulantes en {cityLabel}
          </h1>
          <p className="text-base sm:text-lg mb-5 max-w-2xl" style={{ color: "#C9C1B4" }}>
            {count > 0
              ? `${count} ${count === 1 ? "persona activó su perfil" : "personas activaron su perfil"} en ${cityLabel}: rubro, zona y disponibilidad a la vista.`
              : `Todavía nadie activó su perfil público en ${cityLabel}. Podés ser el primero.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/postulante/nuevo">Creá tu perfil</LinkButton>
            <LinkButton href={`/trabajo/${city}`} variant="secondary">
              Ver trabajo en {cityLabel}
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="max-w-6xl mx-auto">
          {count > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {candidates.map((candidate) => (
                <PostulanteCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          ) : (
            <div
              className="p-6 rounded-[var(--tucv-radius)] text-center"
              style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)", boxShadow: "var(--tucv-shadow)" }}
            >
              <p className="font-bold mb-1">Sin perfiles públicos por ahora</p>
              <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
                Cargá tu perfil una vez y compartilo con un link donde haga falta.
              </p>
              <LinkButton href="/postulante/nuevo">Creá tu perfil</LinkButton>
            </div>
          )}
        </div>
      </section>

      <LiveActivity city={cityLabel} title={`Movimiento en ${cityLabel}`} />
    </main>
  );
}
