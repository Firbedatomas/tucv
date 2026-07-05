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
  // id REAL de candidate_profiles (el campo `candidate` del espejo). `id` de
  // arriba es el id de la fila del espejo public_candidate_cards, NO sirve
  // para las APIs de empresa (guardar/invitar/solicitar contacto), que operan
  // sobre candidate_profiles. Usar SIEMPRE este para esas acciones.
  candidateId: string;
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

// Mapea una fila del ESPEJO public_candidate_cards (no candidate_profiles):
// esos campos ya son los seguros y ya vienen derivados (display_name,
// photo_url como string), calculados por el hook de sincronización en
// pb_hooks/main.pb.js. Ver la migración 1783270002.
function mapCard(c: Record<string, unknown>): PublicCandidateListItem {
  return {
    id: c.id as string,
    candidateId: c.candidate as string,
    slug: c.slug as string,
    displayName: (c.display_name as string) || "Postulante",
    city_zone: (c.city_zone as string) || "",
    categories: (c.categories as string[]) || [],
    category_other: (c.category_other as string) || "",
    experience: (c.experience as string) || "",
    availability: (c.availability as string[]) || [],
    has_own_transport: (c.has_own_transport as string) || "",
    immediate_availability: Boolean(c.immediate_availability),
    bio: (c.bio as string) || "",
    photoUrl: (c.photo_url as string) || null,
    updated: (c.source_updated as string) || (c.updated as string),
  };
}

// El listado del directorio lee del espejo public_candidate_cards, que es
// público (a diferencia de candidate_profiles, cuyo listRule exige auth). El
// espejo solo tiene campos seguros, así que ni un select/expand mal puesto
// puede filtrar whatsapp/fecha de nacimiento/CV. Corre server-side igual
// para armar los contadores en un solo lugar. Tope duro sin rate limit,
// misma razón que listPublicJobs.
const PUBLIC_CANDIDATES_LIMIT = 200;

export async function listPublicCandidates(): Promise<{
  items: PublicCandidateListItem[];
  stats: PublicCandidatesStats;
}> {
  const client = await pbAdmin();
  const { items, totalItems } = await client.collection("public_candidate_cards").getList(1, PUBLIC_CANDIDATES_LIMIT, {
    sort: "-source_updated",
    requestKey: null,
  });

  const mapped: PublicCandidateListItem[] = items.filter((c) => c.slug).map((c) => mapCard(c as unknown as Record<string, unknown>));

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const newToday = items.filter((c) => c.source_created && now - new Date(c.source_created as string).getTime() < DAY).length;
  const activeToday = items.filter((c) => c.source_updated && now - new Date(c.source_updated as string).getTime() < DAY).length;

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
const CANDIDATE_SAFE_FIELDS =
  "id,collectionId,profile_slug,name,city_zone,categories,category_other,experience,availability,has_own_transport,immediate_availability,bio,photo,created,updated";

export async function getPublicCandidateCard(slug: string): Promise<PublicCandidateListItem | null> {
  const client = await pbAdmin();
  const c = await client
    .collection("candidate_profiles")
    .getFirstListItem(client.filter("profile_slug = {:slug}", { slug }), { fields: CANDIDATE_SAFE_FIELDS })
    .catch(() => null);
  if (!c) return null;
  return {
    id: c.id,
    // Acá la fuente es candidate_profiles directamente, así que el id de la
    // fila YA es el id real del candidato.
    candidateId: c.id,
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
    photoUrl: c.photo ? publicFileUrl(c.collectionId as string, c.id, c.photo as string) : null,
    updated: c.updated as string,
  };
}
