import type { MetadataRoute } from "next";
import { RUTAS_ESTATICAS, busquedasIndexables, paginasLocales } from "@/lib/indexable-urls";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Sin esto, Next.js trata este route como estático (no usa cookies/headers/
// searchParams) y lo renderiza UNA VEZ en build time -- justo cuando
// PocketBase todavía no está levantado (es un container aparte, no
// alcanzable desde el builder de Docker), así que la lista de búsquedas
// queda horneada vacía para siempre. Forzado a dinámico, se vuelve a pedir
// en cada visita real al sitemap.
export const dynamic = "force-dynamic";

// La lista de qué es indexable vive en lib/indexable-urls.ts, compartida con
// el barrido de IndexNow -- ver la nota de allá sobre por qué no se duplica.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = RUTAS_ESTATICAS.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const [busquedas, locales] = await Promise.all([busquedasIndexables(), paginasLocales()]);

  const jobEntries: MetadataRoute.Sitemap = busquedas.map((b) => ({
    url: `${BASE_URL}${b.path}`,
    lastModified: b.actualizada,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Páginas locales por ciudad y rubro: son las que apuntan a las consultas
  // que la gente escribe de verdad ("trabajo en Córdoba"). Solo entran las
  // que tienen al menos una búsqueda activa detrás -- ver paginasLocales().
  const localEntries: MetadataRoute.Sitemap = locales.map((l) => ({
    url: `${BASE_URL}${l.path}`,
    changeFrequency: "daily" as const,
    priority: l.prioridad,
  }));

  return [...staticEntries, ...jobEntries, ...localEntries];
}
