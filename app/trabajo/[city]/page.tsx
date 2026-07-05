import type { Metadata } from "next";
import { getPublicJobsForApi } from "@/lib/public-api";
import { ZoneJobsSection } from "@/components/zonas/ZoneJobsSection";
import { cityTextFromSlug, cityLabelFromSlug, zoneMatchesCity } from "@/components/zonas/city";

// force-dynamic por la misma razón que /b/[slug]: la fuente es PocketBase vía
// fetch, y una búsqueda recién publicada tiene que aparecer sin esperar una
// revalidación (misma vidriera en vivo que la home).
export const dynamic = "force-dynamic";

// getPublicJobsForApi(city, ...) filtra internamente con un includes sensible
// a acentos, así que un slug sin tildes ("cordoba") no matchearía "Córdoba".
// Traemos todo (tope 100) y filtramos con zoneMatchesCity, que normaliza
// acentos -- mismo criterio que usamos para candidatos.
async function jobsForCity(cityText: string) {
  const all = await getPublicJobsForApi("", 100);
  return all.filter((j) => zoneMatchesCity(j.zone, cityText));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const cityLabel = cityLabelFromSlug(city);
  const title = `Trabajo en ${cityLabel}`;
  const description = `Búsquedas laborales activas en ${cityLabel}: comercio, gastronomía, oficios y más. Postulate con un clic, sin CV por mail. También podés ver los postulantes de ${cityLabel}.`;
  return {
    title,
    description,
    alternates: { canonical: `/trabajo/${city}` },
    openGraph: { title: `${title} — TuCV`, description, url: `/trabajo/${city}`, type: "website" },
  };
}

export default async function TrabajoCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const cityText = cityTextFromSlug(city);
  const cityLabel = cityLabelFromSlug(city);
  const jobs = await jobsForCity(cityText);

  return <ZoneJobsSection citySlug={city} cityLabel={cityLabel} jobs={jobs} />;
}
