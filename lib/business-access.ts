import type PocketBase from "pocketbase";

export type BusinessRecord = {
  id: string;
  contact_name: string;
  business_name: string;
  phone: string;
  city_zone: string;
  city: string;
  province: string;
  country: string;
  website: string;
  instagram: string;
  bio: string;
  plan: "free" | "pro" | "multi_local";
  logoUrl: string | null;
  created: string;
};

// owner = dueño del negocio (fila en business_accounts). admin / reviewer =
// colaboradores invitados (fila en business_members, campo `role`). Las
// capacidades de cada rol viven en lib/business-permissions.ts.
export type BusinessRole = "owner" | "admin" | "reviewer";

export type BusinessAccess = {
  business: BusinessRecord;
  role: BusinessRole;
  // Solo tiene sentido para colaboradores -- id de la fila en
  // business_members, para poder "salir del equipo" (delete de la propia
  // membresía) sin tener que volver a buscarla.
  membershipId: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBusinessRecord(record: any, client: PocketBase): BusinessRecord {
  return {
    id: record.id,
    contact_name: record.contact_name ?? "",
    business_name: record.business_name,
    phone: record.phone,
    city_zone: record.city_zone,
    city: record.city ?? "",
    province: record.province ?? "",
    country: record.country ?? "",
    website: record.website ?? "",
    instagram: record.instagram ?? "",
    bio: record.bio ?? "",
    plan: record.plan === "pro" || record.plan === "multi_local" ? record.plan : "free",
    logoUrl: record.logo ? client.files.getURL(record, record.logo) : null,
    created: record.created as string,
  };
}

// Único lugar que resuelve "a qué negocio tiene acceso este usuario, y con
// qué rol" -- lo usan tanto useBusinessAuth (páginas /empresa/*) como
// LoginForm (decidir a dónde redirigir después del login) y RegistroForm
// (evitar que alguien ya-miembro-de-un-negocio cree el suyo propio). Dueño
// primero: si por algún bug futuro alguien tuviera las dos filas a la vez,
// el negocio propio gana (aunque hoy eso no debería poder pasar -- ver los
// hooks de pb_hooks/main.pb.js que lo bloquean).
export async function resolveBusinessAccess(client: PocketBase, userId: string): Promise<BusinessAccess | null> {
  try {
    const owned = await client.collection("business_accounts").getFirstListItem(`user="${userId}"`, {
      requestKey: null,
    });
    return { business: mapBusinessRecord(owned, client), role: "owner", membershipId: null };
  } catch {
    // no es dueño de ningún negocio, seguimos a ver si es miembro de uno
  }

  try {
    const membership = await client.collection("business_members").getFirstListItem(`user="${userId}"`, {
      expand: "business",
      requestKey: null,
    });
    const businessRecord = membership.expand?.business;
    if (!businessRecord) return null;
    // Membresías viejas (creadas antes del campo `role`) o cualquier valor
    // inesperado caen a "reviewer", el permiso más acotado -- nunca admin por
    // defecto.
    const role: BusinessRole = membership.role === "admin" ? "admin" : "reviewer";
    return { business: mapBusinessRecord(businessRecord, client), role, membershipId: membership.id };
  } catch {
    return null;
  }
}
