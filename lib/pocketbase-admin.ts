import "server-only";
import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";

// Cliente autenticado como superusuario, solo para uso en Route Handlers /
// Server Components. Nunca se manda al browser. Se usa para resolver datos
// públicos (como la búsqueda por slug) sin exponer `job_posts.listRule`
// (que está restringido al dueño) ni convertir esto en un directorio
// público de búsquedas.
let cachedClient: PocketBase | null = null;
let cachedAt = 0;
const TOKEN_TTL_MS = 10 * 60 * 1000;

export async function pbAdmin(): Promise<PocketBase> {
  const now = Date.now();
  if (cachedClient && cachedClient.authStore.isValid && now - cachedAt < TOKEN_TTL_MS) {
    return cachedClient;
  }
  const client = new PocketBase(POCKETBASE_URL);
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Falta configurar PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD en el servidor.");
  }
  await client.collection("_superusers").authWithPassword(email, password);
  cachedClient = client;
  cachedAt = now;
  return client;
}
