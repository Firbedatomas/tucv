import type { MetadataRoute } from "next";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { businessSlugFor } from "@/lib/slug";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Sin esto, Next.js trata este route como estático (no usa cookies/headers/
// searchParams) y lo renderiza UNA VEZ en build time -- justo cuando
// PocketBase todavía no está levantado (es un container aparte, no
// alcanzable desde el builder de Docker), así que el catch de abajo corre
// en el build y hornea la lista de búsquedas vacía para siempre. Forzado a
// dinámico, se vuelve a pedir en cada visita real al sitemap.
export const dynamic = "force-dynamic";

const STATIC_ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/precios", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/postulante/login", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/empresa/login", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/empresa/registro", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/contacto", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terminos", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Búsquedas activas: son el contenido que más vale la pena indexar (cada
  // una es, en los hechos, una publicación de empleo real). Las cerradas ya
  // van con noindex desde generateMetadata de /b/[slug], no hace falta
  // listarlas acá tampoco.
  let jobEntries: MetadataRoute.Sitemap = [];
  try {
    const client = await pbAdmin();
    const jobs = await client.collection("job_posts").getFullList({
      filter: "active = true",
      fields: "slug,short_code,updated,expand.business.business_name",
      expand: "business",
    });
    jobEntries = jobs.map((job) => {
      const businessName = (job.expand?.business as { business_name?: string } | undefined)?.business_name ?? "";
      // Formato nuevo (negocio/código) cuando hay short_code -- ver la nota
      // en lib/public-job.ts sobre por qué getPublicJob resuelve ambos.
      const path = job.short_code ? `${businessSlugFor(businessName)}/${job.short_code}` : job.slug;
      return {
        url: `${BASE_URL}/b/${path}`,
        lastModified: new Date(job.updated as string),
        changeFrequency: "daily" as const,
        priority: 0.9,
      };
    });
  } catch {
    // Si PocketBase no responde, el sitemap sigue sirviendo las rutas
    // estáticas en vez de romper del todo.
  }

  return [...staticEntries, ...jobEntries];
}
