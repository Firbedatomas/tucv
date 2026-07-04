import "server-only";
import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";

// Valida el token de sesión y devuelve el business_accounts DUEÑO (owner). Un
// viewer/colaborador no tiene fila propia -> tira. Mismo patrón que ya usan
// business-invites y candidate-invitations.
export async function resolveOwnerBusiness(token: string) {
  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(token, null);
  await client.collection("users").authRefresh();
  const userId = client.authStore.record?.id;
  if (!userId) throw new Error("no-user");
  return client.collection("business_accounts").getFirstListItem(`user="${userId}"`);
}
