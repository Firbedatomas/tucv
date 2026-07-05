import type { Metadata } from "next";
import { getPublicJobsForApi } from "@/lib/public-api";
import { CATEGORIES, labelFor } from "@/lib/constants";
import { ZoneJobsSection } from "@/components/zonas/ZoneJobsSection";
import { cityTextFromSlug, cityLabelFromSlug, zoneMatchesCity } from "@/components/zonas/city";

export const dynamic = "force-dynamic";

// Igual que /trabajo/[city] pero además filtra por rubro. `category` es el
// value de CATEGORIES (ej. "cocina"); si no matchea ninguno, labelFor
// devuelve el propio value y la lista queda vacía (no rompe).
async function jobsForCityAndCategory(cityText: string, category: string) {
  const all = await getPublicJobsForApi("", 100);
  return all.filter((j) => j.category === category && zoneMatchesCity(j.zone, cityText));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; category: string }>;
}): Promise<Metadata> {
  const { city, category } = await params;
  const cityLabel = cityLabelFromSlug(city);
  const categoryLabel = labelFor(CATEGORIES, category);
  const title = `Trabajo de ${categoryLabel} en ${cityLabel}`;
  const description = `Búsquedas activas de ${categoryLabel.toLowerCase()} en ${cityLabel}. Postulate con un clic, sin CV por mail, con perfiles claros por zona y disponibilidad.`;
  return {
    title,
    description,
    alternates: { canonical: `/trabajo/${city}/${category}` },
    openGraph: { title: `${title} — TuCV`, description, url: `/trabajo/${city}/${category}`, type: "website" },
  };
}

export default async function TrabajoCityCategoryPage({
  params,
}: {
  params: Promise<{ city: string; category: string }>;
}) {
  const { city, category } = await params;
  const cityText = cityTextFromSlug(city);
  const cityLabel = cityLabelFromSlug(city);
  const categoryLabel = labelFor(CATEGORIES, category);
  const jobs = await jobsForCityAndCategory(cityText, category);

  return <ZoneJobsSection citySlug={city} cityLabel={cityLabel} categoryLabel={categoryLabel} jobs={jobs} />;
}
