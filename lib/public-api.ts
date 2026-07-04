import "server-only";
import { listPublicJobs } from "@/lib/public-jobs-list";
import { CATEGORIES, labelFor } from "@/lib/constants";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

// Shape estable para terceros (widget, RSS, partners). A diferencia del feed
// interno de la home, acá SÍ se incluye el negocio y la zona: una búsqueda
// publicada es contenido pensado para distribuirse (ese es el punto de la
// vidriera digital). Nunca incluye datos de postulantes.
export type PublicApiJob = {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  business: string;
  zone: string;
  url: string;
  createdAt: string;
};

function jobUrl(slug: string, shortCode: string): string {
  const seg = slug || shortCode;
  return `${BASE_URL}/b/${seg}`;
}

// city: match laxo por substring sobre la zona (no hay campo ciudad normalizado
// en job_posts). limit acotado para que la API pública no escale sin techo.
export async function getPublicJobsForApi(city: string, limit: number): Promise<PublicApiJob[]> {
  const all = await listPublicJobs();
  const needle = city.trim().toLowerCase();
  const filtered = needle
    ? all.filter((j) => (j.address_zone || "").toLowerCase().includes(needle))
    : all;
  return filtered.slice(0, Math.max(1, Math.min(limit, 100))).map((j) => ({
    id: j.id,
    title: j.role || j.name || "Búsqueda",
    category: j.category,
    categoryLabel: j.category === "otro" ? j.category_other || "Otro" : labelFor(CATEGORIES, j.category) || j.category,
    business: j.business_name,
    zone: j.address_zone,
    url: jobUrl(j.slug, j.short_code),
    createdAt: j.created,
  }));
}
