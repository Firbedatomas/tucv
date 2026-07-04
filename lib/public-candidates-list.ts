import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";

const PUBLIC_POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8092";

function publicFileUrl(collectionId: string, recordId: string, filename: string): string {
  return `${PUBLIC_POCKETBASE_URL}/api/files/${collectionId}/${recordId}/${filename}`;
}

// Muestra solo primer nombre + inicial del apellido -- nunca el nombre
// completo en el listado público (a diferencia de /p/[slug], que es un
// link que el candidato comparte a propósito con UN empleador puntual,
// ver app/api/public-profile/[slug]/route.ts). "name" es texto libre
// cargado en el form, no first_name/last_name estructurado.
function displayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Postulante";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

// Nombres de campo en snake_case a propósito (no camelCase): así este tipo
// es compatible tal cual con FilterableCandidate/matchesCandidateFilters de
// lib/candidate-filters.ts, la misma lógica de filtrado que ya usa la
// búsqueda privada de empresas -- sin escribir un segundo filtro para el
// directorio público.
export type PublicCandidateListItem = {
  id: string;
  slug: string;
  displayName: string;
  city_zone: string;
  categories: string[];
  category_other: string;
  experience: string;
  availability: string[];
  has_own_transport: string;
  immediate_availability: boolean;
  bio: string;
  photoUrl: string | null;
  updated: string;
};

export type PublicCandidatesStats = {
  totalVisible: number;
  newToday: number;
  activeToday: number;
  topCategory: string | null;
};

function mapSafeFields(c: Record<string, unknown>): PublicCandidateListItem {
  return {
    id: c.id as string,
    slug: c.profile_slug as string,
    displayName: displayName((c.name as string) || ""),
    city_zone: (c.city_zone as string) || "",
    categories: (c.categories as string[]) || [],
    category_other: (c.category_other as string) || "",
    experience: (c.experience as string) || "",
    availability: (c.availability as string[]) || [],
    has_own_transport: (c.has_own_transport as string) || "",
    immediate_availability: Boolean(c.immediate_availability),
    bio: (c.bio as string) || "",
    photoUrl: c.photo ? publicFileUrl(c.collectionId as string, c.id as string, c.photo as string) : null,
    updated: c.updated as string,
  };
}

const SAFE_FIELDS =
  "id,collectionId,profile_slug,name,city_zone,categories,category_other,experience,availability,has_own_transport,immediate_availability,bio,photo,created,updated";

// Mismo criterio que listPublicJobs (lib/public-jobs-list.ts): corre
// SIEMPRE server-side con el superusuario -- candidate_profiles.listRule
// exige auth siempre (ni siquiera con consent_public_profile=true deja
// listar anónimo, a propósito: así el campo "protegido" real -- whatsapp,
// fecha de nacimiento, cv -- nunca queda a un select/expand de distancia
// de un cliente sin filtrar). Tope duro sin rate limit, misma razón que ahí.
const PUBLIC_CANDIDATES_LIMIT = 200;

export async function listPublicCandidates(): Promise<{
  items: PublicCandidateListItem[];
  stats: PublicCandidatesStats;
}> {
  const client = await pbAdmin();
  const { items, totalItems } = await client.collection("candidate_profiles").getList(1, PUBLIC_CANDIDATES_LIMIT, {
    filter: "consent_public_profile = true",
    sort: "-updated",
    requestKey: null,
    fields: SAFE_FIELDS,
  });

  const mapped: PublicCandidateListItem[] = items.filter((c) => c.profile_slug).map(mapSafeFields);

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const newToday = items.filter((c) => now - new Date(c.created as string).getTime() < DAY).length;
  const activeToday = items.filter((c) => now - new Date(c.updated as string).getTime() < DAY).length;

  const categoryCounts = new Map<string, number>();
  for (const c of items) {
    for (const cat of (c.categories as string[]) || []) {
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }
  }
  let topCategory: string | null = null;
  let topCount = 0;
  for (const [cat, count] of categoryCounts) {
    if (count > topCount) {
      topCategory = cat;
      topCount = count;
    }
  }

  return {
    items: mapped,
    stats: { totalVisible: totalItems, newToday, activeToday, topCategory },
  };
}

// Para la tarjeta de compartir (OG image / share-image) de /p/[slug] -- a
// diferencia de listPublicCandidates, NO filtra por consent_public_profile:
// /p/[slug] ya es accesible por cualquiera que tenga el link a propósito
// (ver app/api/public-profile/[slug]/route.ts), regardless de si el
// candidato activó el listado en /postulantes. Solo trae los mismos campos
// "seguros" -- nunca whatsapp/fecha de nacimiento/cv, aunque esos SÍ se
// muestran en la propia página (deliberada, 1 a 1) porque una imagen OG
// queda cacheada/indexada por rastreadores de redes sociales, mucho más
// expuesta que la página en sí.
export async function getPublicCandidateCard(slug: string): Promise<PublicCandidateListItem | null> {
  const client = await pbAdmin();
  const record = await client
    .collection("candidate_profiles")
    .getFirstListItem(client.filter("profile_slug = {:slug}", { slug }), { fields: SAFE_FIELDS })
    .catch(() => null);
  return record ? mapSafeFields(record as unknown as Record<string, unknown>) : null;
}
