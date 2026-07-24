import "server-only";
import { createSign } from "node:crypto";

// Token OAuth2 para una service account, firmando un JWT RS256 con node:crypto.
// Sin SDK de Google a propósito: googleapis pesa decenas de MB y acá se usa
// para una sola llamada por corrida. `node:crypto` alcanza.

const TOKEN_URL = "https://oauth2.googleapis.com/token";

type Credenciales = { email: string; privateKey: string };

// Los tokens duran 1h. Cachearlos en memoria evita un round-trip de firma +
// red en cada notificación. Clave del caché: email + scope.
const cache = new Map<string, { token: string; expiraEn: number }>();

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

export function credencialesDe(prefijo: "GSC" | "GSC_INDEXING"): Credenciales | null {
  const email = process.env[`${prefijo}_CLIENT_EMAIL`];
  const raw = process.env[`${prefijo}_PRIVATE_KEY`];
  if (!email || !raw) return null;
  // En .env la clave va en una sola línea con \n escapados (docker env_file no
  // soporta multilínea), así que hay que devolverle los saltos reales.
  return { email, privateKey: raw.replace(/\\n/g, "\n") };
}

/**
 * Devuelve un access token para el scope pedido, o null si algo falla.
 * Nunca lanza: quien la llama está en un camino best-effort.
 */
export async function getAccessToken(cred: Credenciales, scope: string): Promise<string | null> {
  const clave = `${cred.email}|${scope}`;
  const ahora = Math.floor(Date.now() / 1000);

  const cacheado = cache.get(clave);
  // 60s de margen para no usar un token que expira mientras viaja.
  if (cacheado && cacheado.expiraEn > ahora + 60) return cacheado.token;

  try {
    const encabezado = b64url({ alg: "RS256", typ: "JWT" });
    const cuerpo = b64url({
      iss: cred.email,
      scope,
      aud: TOKEN_URL,
      exp: ahora + 3600,
      iat: ahora,
    });
    const firmar = createSign("RSA-SHA256");
    firmar.update(`${encabezado}.${cuerpo}`);
    const jwt = `${encabezado}.${cuerpo}.${firmar.sign(cred.privateKey, "base64url")}`;

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;

    cache.set(clave, { token: data.access_token, expiraEn: ahora + (data.expires_in ?? 3600) });
    return data.access_token;
  } catch {
    return null;
  }
}
