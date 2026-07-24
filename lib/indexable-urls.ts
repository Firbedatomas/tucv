import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { businessSlugFor } from "@/lib/slug";

// Fuente única de "qué URLs de TuCV vale la pena indexar". La consumen el
// sitemap (app/sitemap.ts) y el barrido diario de IndexNow
// (app/api/cron/indexnow) -- deliberadamente el mismo módulo: si cada uno
// armara su propia lista, con el tiempo divergen y nadie se entera hasta que
// una búsqueda queda fuera de un canal y no del otro.

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export type RutaEstatica = {
  path: string;
  priority: number;
  changeFrequency: "weekly" | "monthly" | "yearly" | "daily";
};

export const RUTAS_ESTATICAS: readonly RutaEstatica[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/precios", priority: 0.8, changeFrequency: "monthly" },
  { path: "/postulante/login", priority: 0.7, changeFrequency: "monthly" },
  { path: "/empresa/login", priority: 0.7, changeFrequency: "monthly" },
  { path: "/empresa/registro", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contacto", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terminos", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
];

export type BusquedaIndexable = { path: string; actualizada: Date };

/**
 * Construye la ruta pública de una búsqueda. Pura y exportada para poder
 * testearla sin PocketBase: es la parte con lógica real (formato nuevo con
 * short_code vs. slug legado, ver lib/public-job.ts).
 */
export function rutaDeBusqueda(job: {
  slug?: string;
  short_code?: string;
  businessName?: string;
}): string | null {
  if (job.short_code) {
    const slugNegocio = businessSlugFor(job.businessName ?? "");
    if (!slugNegocio) return null;
    return `/b/${slugNegocio}/${job.short_code}`;
  }
  if (job.slug) return `/b/${job.slug}`;
  return null;
}

/**
 * Búsquedas activas: son el contenido que más vale la pena indexar (cada una
 * es, en los hechos, una publicación de empleo real). Las cerradas ya van con
 * noindex desde generateMetadata, no hace falta listarlas.
 *
 * Nunca lanza: si PocketBase no responde devuelve lista vacía, para que el
 * sitemap siga sirviendo las rutas estáticas en vez de romper del todo.
 */
export async function busquedasIndexables(): Promise<BusquedaIndexable[]> {
  try {
    const client = await pbAdmin();
    const jobs = await client.collection("job_posts").getFullList({
      filter: "active = true",
      fields: "slug,short_code,updated,expand.business.business_name",
      expand: "business",
    });

    const salida: BusquedaIndexable[] = [];
    for (const job of jobs) {
      const businessName = (job.expand?.business as { business_name?: string } | undefined)?.business_name;
      const path = rutaDeBusqueda({
        slug: job.slug as string | undefined,
        short_code: job.short_code as string | undefined,
        businessName,
      });
      if (!path) continue;
      salida.push({ path, actualizada: new Date(job.updated as string) });
    }
    return salida;
  } catch {
    return [];
  }
}

/** Todas las URLs absolutas indexables: estáticas + búsquedas activas. */
export async function todasLasUrlsIndexables(): Promise<string[]> {
  const busquedas = await busquedasIndexables();
  return [
    ...RUTAS_ESTATICAS.map((r) => `${BASE_URL}${r.path}`),
    ...busquedas.map((b) => `${BASE_URL}${b.path}`),
  ];
}
