import "server-only";
import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";

// Valida un token de sesión de postulante y devuelve el userId, o null. Se usa
// en las rutas de la capa de interacción para autenticar al candidato dueño
// sin abrir reglas de escritura en las colecciones.
export async function resolveUserIdFromToken(token: string): Promise<string | null> {
  try {
    const client = new PocketBase(POCKETBASE_URL);
    client.authStore.save(token, null);
    await client.collection("users").authRefresh();
    return client.authStore.record?.id ?? null;
  } catch {
    return null;
  }
}
