import PocketBase from "pocketbase";

const POCKETBASE_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8092";

// Singleton de browser. Todo lo que usa `pb()` en este proyecto es código
// "use client" -> hay un solo usuario por pestaña, así que compartir la
// instancia (y su authStore) es lo correcto: si no, cada componente tiene su
// propio authStore en memoria y no se entera cuando OTRO componente hace
// login/logout en la misma pestaña (el evento `storage` de LocalAuthStore
// solo sincroniza entre pestañas distintas, no dentro de la misma).
// Para uso server-side (route handlers) existe `pbAdmin()` en
// pocketbase-admin.ts, que sí crea una instancia nueva por request.
let browserInstance: PocketBase | null = null;

export function pb(): PocketBase {
  if (typeof window === "undefined") {
    // SSR/build: no hay browser ni localStorage, una instancia efímera alcanza.
    return new PocketBase(POCKETBASE_URL);
  }
  if (!browserInstance) {
    browserInstance = new PocketBase(POCKETBASE_URL);
  }
  return browserInstance;
}

export { POCKETBASE_URL };
