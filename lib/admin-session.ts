import "server-only";

// Cookie de sesión de admin firmada con HMAC-SHA256 via Web Crypto (no
// jsonwebtoken/jose): así el mismo código sirve tanto en el middleware (Edge
// runtime) como en los route handlers (Node runtime) sin depender de una
// librería que no corra en ambos.
export const ADMIN_SESSION_COOKIE = "tucv_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12hs

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta configurar ADMIN_SESSION_SECRET en el servidor.");
  }
  return secret;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  let str = "";
  for (const b of new Uint8Array(bytes)) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  const str = atob(padded);
  return Uint8Array.from(str, (c) => c.charCodeAt(0));
}

export async function createAdminSessionCookieValue(email: string): Promise<string> {
  const payload = JSON.stringify({ email, exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload).buffer as ArrayBuffer);
  const key = await hmacKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${toBase64Url(sig)}`;
}

// Devuelve el email si la cookie es válida (firma correcta y no vencida), o
// null en cualquier otro caso -- nunca tira, para que llamarlo desde el
// middleware en cada request sea siempre seguro.
export async function verifyAdminSessionCookieValue(value: string | undefined | null): Promise<string | null> {
  if (!value) return null;
  const [payloadB64, sigB64] = value.split(".");
  if (!payloadB64 || !sigB64) return null;
  try {
    const key = await hmacKey(getSecret());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sigB64) as BufferSource,
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64))) as {
      email: string;
      exp: number;
    };
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload.email;
  } catch {
    return null;
  }
}
