import "server-only";
import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";

// Valida un token de sesión de postulante y devuelve el userId, o null. Se usa
// en las rutas de la capa de interacción para autenticar al candidato dueño
// sin abrir reglas de escritura en las colecciones.
export async function resolveUserIdFromToken(token: string): Promise<string | null> {
  const user = await resolveUserFromToken(token);
  return user?.id ?? null;
}

// Igual que arriba pero devuelve id + verified (para acciones que exigen email
// verificado, como recomendar).
export async function resolveUserFromToken(
  token: string,
): Promise<{ id: string; verified: boolean } | null> {
  try {
    const client = new PocketBase(POCKETBASE_URL);
    client.authStore.save(token, null);
    await client.collection("users").authRefresh();
    const rec = client.authStore.record;
    if (!rec?.id) return null;
    return { id: rec.id, verified: Boolean(rec.verified) };
  } catch {
    return null;
  }
}
