import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { hidesExtraChips } from "@/lib/plan-limits";

const PUBLIC_POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8092";

function publicFileUrl(collectionId: string, recordId: string, filename: string): string {
  return `${PUBLIC_POCKETBASE_URL}/api/files/${collectionId}/${recordId}/${filename}`;
}

export type PublicJobListItem = {
  id: string;
  slug: string;
  short_code: string;
  name: string;
  category: string;
  category_other: string;
  address_zone: string;
  role: string;
  shift: string[];
  schedule_details: string;
  experience_required: string;
  perks: string[];
  hard_requirements: string[];
  salary_mode: string;
  salary_amount: string;
  vacancies: string;
  business_name: string;
  business_logo_url: string | null;
  created: string;
  featured: boolean;
};

// Listado público para el feed en vivo de la home -- a diferencia de
// getPublicJob (una búsqueda puntual por slug), acá el listRule de
// job_posts NO deja anónimos ("solo el negocio dueño puede listar"), así
// que esto SIEMPRE corre server-side con el superusuario, nunca expuesto
// directo al cliente. Ver app/api/public-jobs/route.ts.
// Tope duro del feed público -- esto corre sin auth y sin rate limit
// (cualquiera puede pegarle a /api/public-jobs), así que un getFullList()
// sin límite escala el costo de cada request con la cantidad total de
// búsquedas activas en toda la plataforma. 200 alcanza de sobra para una
// home de "búsquedas recientes" en un mercado local -- si algún día hace
// falta mostrar más, la respuesta correcta es paginar el feed, no subir
// este número sin más.
const PUBLIC_JOBS_LIMIT = 200;

export async function listPublicJobs(): Promise<PublicJobListItem[]> {
  const client = await pbAdmin();
  const now = new Date().toISOString();
  const { items } = await client.collection("job_posts").getList(1, PUBLIC_JOBS_LIMIT, {
    filter: client.filter("active = true && expires_at > {:now}", { now }),
    // Destacadas (featured_until vigente) primero, después las más nuevas
    // -- PocketBase ordena nulls/vacíos primero en DESC, así que "-featured_until"
    // solo no alcanza (mezclaría vencidas/nunca-destacadas con las vigentes
    // en cualquier orden); filtramos "vigente" en JS con el corte por fecha.
    sort: "-featured_until,-created",
    expand: "business",
    // Mismo motivo que en getPublicJob (lib/public-job.ts): pbAdmin() es un
    // cliente compartido para todo el servidor, y con muchas visitas a la
    // home pidiendo esta misma consulta a la vez, el autocancel de
    // "pedidos duplicados" del SDK puede tirar abajo alguna en favor de
    // otra -- acá se traduciría en una lista vacía o vieja de forma
    // intermitente.
    requestKey: null,
    fields:
      "id,slug,short_code,name,category,category_other,address_zone,role,shift,schedule_details,experience_required,perks,hard_requirements,salary_mode,salary_amount,vacancies,created,featured_until,expand.business.business_name,expand.business.logo,expand.business.collectionId,expand.business.id,expand.business.plan",
  });

  const nowMs = Date.now();
  const mapped = items.map((job) => {
    const business = job.expand?.business as
      | { business_name?: string; logo?: string; collectionId?: string; id?: string; plan?: string }
      | undefined;
    const featured = Boolean(job.featured_until) && new Date(job.featured_until as string).getTime() > nowMs;
    // Mismo criterio que getPublicJob (lib/public-job.ts): plan gratis no
    // muestra beneficios ni requisitos en el link público.
    const hideExtras = hidesExtraChips(business?.plan ?? "free");
    return {
      id: job.id,
      slug: job.slug,
      short_code: job.short_code ?? "",
      name: job.name,
      category: job.category,
      category_other: job.category_other ?? "",
      address_zone: job.address_zone,
      role: job.role,
      shift: job.shift ?? [],
      schedule_details: job.schedule_details ?? "",
      experience_required: job.experience_required,
      perks: hideExtras ? [] : job.perks ?? [],
      hard_requirements: hideExtras ? [] : job.hard_requirements ?? [],
      salary_mode: job.salary_mode ?? "",
      salary_amount: job.salary_amount ?? "",
      vacancies: job.vacancies ?? "",
      business_name: business?.business_name ?? "",
      business_logo_url:
        business?.logo && business.collectionId && business.id
          ? publicFileUrl(business.collectionId, business.id, business.logo)
          : null,
      created: job.created as string,
      featured,
    };
  });

  // El sort de PocketBase ya deja lo destacado arriba en la práctica (fechas
  // futuras > vacío/pasado en DESC), pero no está garantizado para
  // featured_until vencido vs. nunca seteado -- reordenamos en JS para que
  // "featured" sea la fuente de verdad real, no una suposición sobre cómo
  // ordena la base.
  mapped.sort((a, b) => Number(b.featured) - Number(a.featured));
  return mapped;
}
