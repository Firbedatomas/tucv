import "server-only";
import { credencialesDe, getAccessToken } from "@/lib/google-auth";

// Google Indexing API.
//
// Google NO tiene un "IndexNow" público: su Indexing API está restringida por
// POLÍTICA a dos tipos de contenido, `JobPosting` y `BroadcastEvent`. Usarla
// para cualquier otra página arriesga que la cuenta quede marcada.
//
// TuCV publica JobPosting (ver el JSON-LD de app/b/[slug]/[code]/page.tsx), así
// que es uno de los dos casos donde Google sí lo permite -- por eso acá se
// puede automatizar "pedile a Google que indexe ya", que para un sitio normal
// es imposible.
//
// La contracara es que hay que ser MUY estricto con qué URL se manda: ver
// `esUrlDeBusqueda`, que es la guarda que evita perder ese privilegio.

const ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const SCOPE = "https://www.googleapis.com/auth/indexing";

export type TipoNotificacion = "URL_UPDATED" | "URL_DELETED";

/**
 * Solo las URLs de búsquedas (`/b/...`) llevan JobPosting. Cualquier otra
 * página de TuCV -- home, precios, perfiles, login -- está FUERA de la
 * política de la Indexing API.
 *
 * Pura y testeada a propósito: es la guarda que protege el acceso a la API.
 * Si alguna vez falla, el castigo no es un error visible sino perder el
 * privilegio, que es mucho peor.
 */
export function esUrlDeBusqueda(url: string, base = "https://tucv.ar"): boolean {
  let host: string;
  try {
    host = new URL(base).host;
  } catch {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.host !== host) return false;
  // /b/<negocio>/<codigo> o el formato legado /b/<slug>. Al menos un segmento
  // después de /b/, y ninguno vacío.
  const partes = parsed.pathname.split("/").filter(Boolean);
  if (partes[0] !== "b") return false;
  if (partes.length < 2 || partes.length > 3) return false;
  return true;
}

export type ResultadoIndexing =
  | { ok: true }
  | { ok: false; razon: string };

/**
 * Avisa a Google que una búsqueda cambió (`URL_UPDATED`) o dejó de estar
 * disponible (`URL_DELETED`).
 *
 * Nunca lanza. Si no hay credenciales configuradas devuelve `ok: false` con
 * la razón, sin ruido: el sistema tiene que seguir funcionando igual sin
 * esta integración.
 */
export async function notificarAGoogle(
  url: string,
  tipo: TipoNotificacion,
): Promise<ResultadoIndexing> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

  if (!esUrlDeBusqueda(url, base)) {
    return { ok: false, razon: "la URL no es una búsqueda (fuera de la política de la Indexing API)" };
  }

  const cred = credencialesDe("GSC_INDEXING");
  if (!cred) return { ok: false, razon: "sin credenciales de Indexing configuradas" };

  const token = await getAccessToken(cred, SCOPE);
  if (!token) return { ok: false, razon: "no se pudo obtener el access token" };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, type: tipo }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      // 429 = cuota diaria agotada (200/día por defecto). No es un bug: es el
      // límite del servicio, y el barrido del sitemap lo cubre igual.
      return { ok: false, razon: `HTTP ${res.status}${detalle ? `: ${detalle.slice(0, 200)}` : ""}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, razon: err instanceof Error ? err.message : "error desconocido" };
  }
}
