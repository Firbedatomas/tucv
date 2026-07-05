import "server-only";
import type { Metadata } from "next";
import { cache } from "react";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { CATEGORIES, AVAILABILITY, EXPERIENCE, labelFor, labelsFor, type ScreeningQuestion } from "@/lib/constants";
import { hidesExtraChips } from "@/lib/plan-limits";
import { htmlToPlainText } from "@/lib/sanitize-html";
import { businessSlugFor } from "@/lib/slug";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// pbAdmin() habla con PocketBase por la URL INTERNA de Docker -> nunca usar
// client.files.getURL() para algo que va al navegador (arma la URL con esa
// base interna que el browser no puede resolver). Mismo patrón que
// /api/public-profile/[slug].
const PUBLIC_POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8092";

function publicFileUrl(collectionId: string, recordId: string, filename: string): string {
  return `${PUBLIC_POCKETBASE_URL}/api/files/${collectionId}/${recordId}/${filename}`;
}

export type PublicJob = {
  id: string;
  name: string;
  short_code: string;
  category: string;
  category_other: string;
  address_zone: string;
  role: string;
  main_tasks: string[];
  shift: string[];
  experience_required: string;
  perks: string[];
  visible_message: string;
  schedule_details: string;
  vacancies: string;
  hard_requirements: string[];
  salary_mode: string;
  salary_amount: string;
  screening_questions: ScreeningQuestion[];
  active: boolean;
  /** Flag cruda sin combinar con el vencimiento -- distingue "el negocio la
   * cerró a mano" (false acá, expires_at todavía en el futuro) de "se
   * venció sola" (true acá, expires_at ya pasó). `active` ya combina
   * ambas para no romper el resto del código que solo necesita saber si
   * está disponible para postularse. */
  raw_active: boolean;
  created: string;
  expires_at: string;
  business_name: string;
  business_logo_url: string | null;
  business_website: string;
  business_instagram: string;
  business_bio: string;
  business_created: string;
  business_plan: string;
  // --- Capa de confianza del negocio (computada al leer, sin campos nuevos
  // en PocketBase) ---
  business_verified: boolean;
  /** job_posts del negocio activas y sin vencer, ahora mismo. */
  business_active_searches: number;
  /** Total histórico de job_posts publicadas por el negocio. */
  business_published_searches: number;
  /** Postulaciones respondidas (estado != "nuevo") / total. null si no hubo
   * ninguna postulación todavía. */
  business_response_rate: number | null;
  /** Total de postulaciones recibidas por el negocio -- para decidir si la
   * tasa de respuesta tiene muestra suficiente antes de mostrarla. */
  business_total_applications: number;
};

export type BusinessReputation = {
  verified: boolean;
  activeSearches: number;
  publishedSearches: number;
  responseRate: number | null;
  totalApplications: number;
};

// Reputación honesta del negocio computada 100% al leer (conteos con
// getList/totalItems, sin traer las filas) -- no hay campos derivados
// guardados que puedan quedar desactualizados ni migración de PocketBase.
// La tasa de respuesta usa el estado ACTUAL de la postulación como proxy de
// "pasó de nuevo a otro estado": los estados solo avanzan (nuevo ->
// contactado/entrevista/contratado/descartado), así que status != "nuevo"
// equivale a "el negocio ya la trabajó". Compartida entre getPublicJob (link
// público) y /api/business-reputation (panel de la empresa).
export async function computeBusinessReputation(
  businessId: string,
  verified: boolean,
): Promise<BusinessReputation> {
  try {
    const client = await pbAdmin();
    const nowIso = new Date().toISOString();
    const [published, active, totalApps, respondedApps] = await Promise.all([
      client.collection("job_posts").getList(1, 1, {
        filter: client.filter("business = {:b}", { b: businessId }),
        requestKey: null,
      }),
      client.collection("job_posts").getList(1, 1, {
        filter: client.filter("business = {:b} && active = true && expires_at > {:now}", {
          b: businessId,
          now: nowIso,
        }),
        requestKey: null,
      }),
      client.collection("applications").getList(1, 1, {
        filter: client.filter("job_post.business = {:b}", { b: businessId }),
        requestKey: null,
      }),
      client.collection("applications").getList(1, 1, {
        filter: client.filter("job_post.business = {:b} && status != {:s}", { b: businessId, s: "nuevo" }),
        requestKey: null,
      }),
    ]);
    const totalApplications = totalApps.totalItems;
    return {
      verified,
      activeSearches: active.totalItems,
      publishedSearches: published.totalItems,
      responseRate: totalApplications > 0 ? respondedApps.totalItems / totalApplications : null,
      totalApplications,
    };
  } catch {
    // Best-effort: si algún conteo falla, no rompemos la página -- devolvemos
    // la reputación vacía (la UI no muestra nada cuando no hay datos).
    return { verified, activeSearches: 0, publishedSearches: 0, responseRate: null, totalApplications: 0 };
  }
}

// Compartida entre /api/public-job/[slug] (la usa el cliente para refrescar
// el estado de la postulación) y app/b/[slug]/page.tsx + app/b/[slug]/[code]/page.tsx
// (Server Components, para generateMetadata + JSON-LD) -- antes cada uno
// pegaba a PocketBase por su cuenta con el mismo mapeo copiado y pegado.
//
// `identifier` puede ser el slug largo heredado ("negocio-puesto-a-b1c2d",
// formato viejo, un solo segmento de URL) o el short_code nuevo (6
// caracteres, segundo segmento de la URL nueva /b/negocio/codigo) -- se
// busca por cualquiera de los dos campos, así una sola función atiende
// ambos formatos de link sin duplicar esta lógica.
//
// Envuelta en cache() de React: generateMetadata() y el render de la página
// llaman a esto con el mismo identificador en el mismo request -- sin
// dedupe, cada visita a /b/... pegaba dos veces a PocketBase por gaje (y,
// peor, haría que el contador de vistas de abajo cuente doble por visita).
export const getPublicJob = cache(async (identifier: string): Promise<PublicJob | null> => {
  try {
    const client = await pbAdmin();
    // requestKey: null es necesario -- pbAdmin() reutiliza UN MISMO cliente
    // para todo el servidor, y generateMetadata() + esta misma función
    // llamada desde el render de la página piden el mismo identificador casi
    // al mismo tiempo. Por default el SDK autocancela el pedido anterior
    // cuando ve otro "igual" (mismo método+URL) en vuelo, así que sin esto
    // una de las dos llamadas se cancela sola y getPublicJob devuelve null
    // -- reproducido en producción: la búsqueda real tiraba 404 de forma
    // intermitente (andaba en la primera visita tras un restart, después
    // no).
    const job = await client
      .collection("job_posts")
      .getFirstListItem(client.filter("slug = {:id} || short_code = {:id}", { id: identifier }), {
        expand: "business",
        requestKey: null,
      });

    const business = job.expand?.business as
      | {
          id: string;
          collectionId: string;
          business_name?: string;
          logo?: string;
          website?: string;
          instagram?: string;
          bio?: string;
          created?: string;
          plan?: string;
          verified?: boolean;
        }
      | undefined;
    const expired = new Date(job.expires_at as string).getTime() < Date.now();
    // Reputación honesta del negocio -- conteos livianos (totalItems, sin
    // traer filas). Si no hay negocio expandido, queda todo en cero/null y la
    // UI no muestra nada.
    const reputation = business?.id
      ? await computeBusinessReputation(business.id, Boolean(business.verified))
      : { verified: false, activeSearches: 0, publishedSearches: 0, responseRate: null, totalApplications: 0 };
    // Plan gratis: beneficios y requisitos no se muestran en el link
    // público (son "extra", no imprescindibles para postularse) -- se
    // sacan acá, del lado del servidor, para que ni siquiera lleguen al
    // cliente en ese caso, no solo se oculten visualmente.
    const hideExtras = hidesExtraChips(business?.plan ?? "free");

    return {
      id: job.id,
      name: job.name,
      short_code: job.short_code ?? "",
      category: job.category,
      category_other: job.category_other ?? "",
      address_zone: job.address_zone,
      role: job.role,
      main_tasks: job.main_tasks ?? [],
      shift: job.shift,
      experience_required: job.experience_required,
      perks: hideExtras ? [] : job.perks ?? [],
      visible_message: job.visible_message,
      schedule_details: job.schedule_details ?? "",
      vacancies: job.vacancies ?? "",
      hard_requirements: hideExtras ? [] : job.hard_requirements ?? [],
      salary_mode: job.salary_mode ?? "",
      salary_amount: job.salary_amount ?? "",
      screening_questions: job.screening_questions ?? [],
      active: Boolean(job.active) && !expired,
      raw_active: Boolean(job.active),
      created: job.created as string,
      expires_at: job.expires_at as string,
      business_name: business?.business_name ?? "",
      business_logo_url:
        business?.logo && business.collectionId && business.id
          ? publicFileUrl(business.collectionId, business.id, business.logo)
          : null,
      business_website: business?.website ?? "",
      business_instagram: business?.instagram ?? "",
      business_bio: business?.bio ?? "",
      business_created: business?.created ?? "",
      business_plan: business?.plan ?? "free",
      business_verified: reputation.verified,
      business_active_searches: reputation.activeSearches,
      business_published_searches: reputation.publishedSearches,
      business_response_rate: reputation.responseRate,
      business_total_applications: reputation.totalApplications,
    };
  } catch {
    return null;
  }
});

// Fire-and-forget a propósito -- un contador de vistas best-effort no debe
// bloquear ni poder romper el render de la página si PocketBase tarda o
// falla. Se llama UNA sola vez desde el Server Component de la página (no
// desde generateMetadata, que corre en paralelo/duplicado para el mismo
// request) para no contar cada visita dos veces.
export function incrementJobViews(jobId: string): void {
  (async () => {
    const client = await pbAdmin();
    const job = await client.collection("job_posts").getOne(jobId, { requestKey: null });
    await client
      .collection("job_posts")
      .update(jobId, { views: (job.views ?? 0) + 1 }, { requestKey: null });
  })().catch(() => {
    // Best-effort: si falla, simplemente no sumó esa vista.
  });
}

function jobCategoryLabel(job: PublicJob): string {
  return job.category === "otro" && job.category_other ? job.category_other : labelFor(CATEGORIES, job.category);
}

// Compartida entre app/b/[slug]/page.tsx (formato heredado) y
// app/b/[slug]/[code]/page.tsx (formato nuevo) -- ambas rutas resuelven al
// mismo PublicJob vía getPublicJob() y sirven el mismo contenido, pero antes
// cada una ponía como canonical SU PROPIA URL (un segmento vs. dos) -- eso
// deja dos URLs indexables compitiendo por el mismo contenido (señal de
// contenido duplicado) en vez de consolidar en una sola. El formato nuevo es
// el que se promociona activamente (QR, compartir), así que el canonical
// SIEMPRE apunta ahí, sin importar por cuál ruta se haya entrado -- el link
// viejo sigue sirviendo el contenido igual, solo deja de competir por
// indexación con el nuevo.
export function buildJobMetadata(job: PublicJob | null): Metadata {
  if (!job) return { title: "Búsqueda no encontrada — TuCV" };

  const title = `${job.role} en ${job.business_name} — TuCV`;
  const visibleMessagePlain = htmlToPlainText(job.visible_message);
  const description = `${jobCategoryLabel(job)} en ${job.address_zone}. ${visibleMessagePlain || `Búsqueda publicada por ${job.business_name} en TuCV.`}`.slice(
    0,
    160,
  );
  const canonicalPath = `/b/${businessSlugFor(job.business_name)}/${job.short_code}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}${canonicalPath}`,
      type: "website",
      // Sin "images" acá a propósito -- así Next conecta sola la imagen del
      // opengraph-image.tsx correspondiente (tarjeta con puesto, salario,
      // zona y logo TuCV, ver lib/job-share-card.tsx) en vez de pisarla con
      // el logo crudo del negocio. Esto no cambia por el canonical de
      // arriba: Next resuelve la imagen según la ruta REAL que se está
      // renderizando, no según `alternates.canonical`.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: job.active ? { index: true, follow: true } : { index: false, follow: true },
  };
}

function jobEmploymentType(shift: string[]): string[] {
  const types: string[] = [];
  if (shift.includes("full_time")) types.push("FULL_TIME");
  if (shift.includes("part_time")) types.push("PART_TIME");
  return types.length > 0 ? types : ["OTHER"];
}

// salary_amount se guarda ya formateado con "$" y "." de miles (lo escribe
// ThousandsInput.tsx tal cual se ve en pantalla, ej. "$1.300.000 a
// $1.600.000") -- para baseSalary en JSON-LD hace falta el número limpio.
// Si el texto no tiene exactamente 1 o 2 números (alguien escribió algo raro
// tipo "a convenir según perfil"), no forzamos un baseSalary mal formado:
// mejor omitirlo que mandarle a Google Rich Results un valor inventado.
function extractSalaryAmounts(salaryAmount: string): number[] {
  const cleaned = salaryAmount.replace(/\$/g, "").replace(/(?<=\d)\.(?=\d)/g, "");
  const matches = cleaned.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

function jobBaseSalary(job: PublicJob): Record<string, unknown> | null {
  if (job.salary_mode !== "mostrar" || !job.salary_amount) return null;
  const amounts = extractSalaryAmounts(job.salary_amount);
  if (amounts.length === 1) {
    return {
      "@type": "MonetaryAmount",
      currency: "ARS",
      value: { "@type": "QuantitativeValue", value: amounts[0], unitText: "MONTH" },
    };
  }
  if (amounts.length === 2) {
    return {
      "@type": "MonetaryAmount",
      currency: "ARS",
      value: { "@type": "QuantitativeValue", minValue: amounts[0], maxValue: amounts[1], unitText: "MONTH" },
    };
  }
  return null;
}

export function buildJobJsonLd(job: PublicJob): Record<string, unknown> | null {
  if (!job.active) return null;
  const baseSalary = jobBaseSalary(job);
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.role,
    description: [
      htmlToPlainText(job.visible_message),
      job.schedule_details && `Horario: ${job.schedule_details}.`,
      `Experiencia requerida: ${labelFor(EXPERIENCE, job.experience_required)}.`,
      `Turno: ${labelsFor(AVAILABILITY, job.shift).join(", ")}.`,
    ]
      .filter(Boolean)
      .join(" "),
    identifier: { "@type": "PropertyValue", name: "TuCV", value: job.id },
    // PocketBase devuelve las fechas como "2026-07-03 03:49:07.460Z" (sin
    // "T") -- Google Rich Results exige ISO 8601 estricto para
    // datePosted/validThrough, si no lo tira como error de formato.
    datePosted: new Date(job.created).toISOString(),
    validThrough: new Date(job.expires_at).toISOString(),
    employmentType: jobEmploymentType(job.shift),
    hiringOrganization: {
      "@type": "Organization",
      name: job.business_name,
      ...(job.business_logo_url ? { logo: job.business_logo_url } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.address_zone,
        addressCountry: "AR",
      },
    },
    ...(baseSalary ? { baseSalary } : {}),
    directApply: true,
  };
}
