import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import type { MemberKind, MemberNumber } from "@/lib/member-card";

export const MEMBER_COLLECTION: Record<MemberKind, string> = {
  candidate: "candidate_profiles",
  business: "business_accounts",
};

// El número de miembro se calcula al leer, contando cuántos registros hay con
// `created` menor o igual al propio -- no hay un contador guardado que pueda
// quedar desincronizado si se borra una cuenta o se importan filas a mano.
// Mismo criterio que computeBusinessReputation (lib/public-job.ts): conteos
// con getList/totalItems, sin traer las filas.
//
// Empate exacto de milisegundo (dos altas simultáneas) daría el mismo número a
// las dos. Es aceptable: la tarjeta es una celebración, no un registro legal.
export async function getMemberNumber(kind: MemberKind, id: string): Promise<MemberNumber | null> {
  const collection = MEMBER_COLLECTION[kind];
  try {
    const client = await pbAdmin();
    const record = await client
      .collection(collection)
      .getOne(id, { fields: "id,created", requestKey: null });

    const [upToMe, all] = await Promise.all([
      client.collection(collection).getList(1, 1, {
        filter: client.filter("created <= {:c}", { c: record.created }),
        requestKey: null,
      }),
      client.collection(collection).getList(1, 1, { requestKey: null }),
    ]);

    return {
      kind,
      number: Math.max(1, upToMe.totalItems),
      total: Math.max(all.totalItems, upToMe.totalItems),
      joinedAt: normalizeCreated(record.created as string),
    };
  } catch {
    // Registro inexistente, PocketBase caído o admin mal configurado: la
    // celebración se saltea sola en el cliente, nunca rompe el alta.
    return null;
  }
}

// PocketBase devuelve `created` como "2026-08-07 12:34:56.789Z" (con espacio),
// que no es ISO válido en todos los runtimes. Lo normalizamos una sola vez acá
// para que tanto el JSON como la imagen parseen igual.
export function normalizeCreated(created: string): string {
  const iso = created.replace(" ", "T");
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}
