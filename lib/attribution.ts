// Helpers puros de atribución. El sistema deja una cookie `tucv_ref=<token>`
// cuando alguien entra por un link compartido (/s/<token>). Después, cuando esa
// persona se registra o se postula, el server lee la cookie para saber qué
// share (y por lo tanto qué canal) trajo esa conversión.
//
// Este archivo NO importa "server-only" a propósito: son funciones puras sobre
// strings/headers, reutilizables desde route handlers, server components o
// tests. El cableado de las conversiones (*_from_share) lo hace el flujo de
// registro/postulación por separado; acá solo dejamos listo el lector.

export const REF_COOKIE = "tucv_ref";

// Duración de la ventana de atribución: 7 días. Suficiente para que un click de
// hoy se acredite a la registración/postulación de esta semana sin arrastrar
// atribuciones viejas para siempre.
export const REF_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type ShareEntityType = "profile" | "job";

export type ShareChannel =
  | "whatsapp"
  | "x"
  | "instagram"
  | "copy"
  | "qr"
  | "poster"
  | "widget"
  | "rss"
  | "api";

// Parsea el header Cookie crudo y devuelve el valor de la cookie pedida, o null.
// No usa APIs de Next (cookies()) para poder correr desde cualquier contexto
// que tenga el header a mano (route handler, edge, test).
export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

// Token de atribución (el share_link.token) presente en la request, o null si
// la persona no llegó por un link compartido. Acepta tanto un Headers como un
// Request para comodidad del caller.
export function getRefToken(source: Headers | Request | null | undefined): string | null {
  if (!source) return null;
  const headers = source instanceof Request ? source.headers : source;
  return readCookie(headers.get("cookie"), REF_COOKIE);
}
