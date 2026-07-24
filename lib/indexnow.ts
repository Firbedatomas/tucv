// IndexNow: avisarle a Bing/Yandex que una URL cambió, sin esperar a que
// pasen a rastrear solos.
//
// Por qué importa más allá de "aparecer en Bing": los asistentes de IA que
// navegan la web para responder (ChatGPT y Copilot en modo búsqueda) leen el
// índice de BING, no el de Google. Todo el trabajo de SEO clásico apunta al
// canal de Google; esto abre el otro, que es justo el que consultan los LLMs.
//
// La clave NO es un secreto: su único fin es probar que quien la publica
// controla el dominio. Por eso vive en public/indexnow-key.txt y se commitea.

const ENDPOINT = "https://api.indexnow.org/indexnow";
const KEY = "20112ebb8b2aac4b8cb2d0946a61f0a3";
const KEY_PATH = "/indexnow-key.txt";

// Límite del protocolo: 10.000 URLs por request.
const MAX_URLS_PER_REQUEST = 10_000;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";
}

export type IndexNowResult =
  | { ok: true; submitted: number; skipped: number }
  | { ok: false; reason: string; submitted: 0; skipped: number };

/**
 * Deja solo las URLs que pertenecen al host del sitio. IndexNow rechaza el
 * lote entero si una sola URL es de otro dominio, así que filtrar acá es lo
 * que evita que una URL basura invalide un barrido completo.
 *
 * Función pura a propósito: es la parte que se puede testear sin red.
 */
export function filterOwnUrls(urls: readonly string[], base = baseUrl()): string[] {
  let host: string;
  try {
    host = new URL(base).host;
  } catch {
    return [];
  }

  const seen = new Set<string>();
  for (const raw of urls) {
    // `new URL(x, base)` resuelve CUALQUIER string como ruta relativa: sin
    // este filtro, "no es una url" se convierte en
    // https://tucv.ar/no%20es%20una%20url y termina enviada como si fuera
    // una página real. Solo aceptamos URL absoluta o ruta que arranque en "/".
    if (!/^https?:\/\//i.test(raw) && !raw.startsWith("/")) continue;

    let parsed: URL;
    try {
      parsed = new URL(raw, base);
    } catch {
      continue;
    }
    if (parsed.host !== host) continue;
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
    // Sin hash: para un buscador `/a#x` y `/a` son la misma URL, mandar las
    // dos gasta cuota del lote sin agregar información.
    parsed.hash = "";
    seen.add(parsed.toString());
  }
  return [...seen];
}

/**
 * Envía las URLs a IndexNow. Nunca lanza: cualquier fallo se devuelve como
 * `{ ok: false }`.
 *
 * Es deliberado -- esto es una mejora de posicionamiento, no una operación
 * crítica. Si el endpoint de Bing está caído, publicar una búsqueda tiene que
 * seguir funcionando igual.
 */
export async function submitToIndexNow(urls: readonly string[]): Promise<IndexNowResult> {
  const base = baseUrl();
  const urlList = filterOwnUrls(urls, base);
  const skipped = urls.length - urlList.length;

  if (urlList.length === 0) {
    return { ok: false, reason: "sin URLs válidas para este host", submitted: 0, skipped };
  }
  if (base.startsWith("http://localhost")) {
    return { ok: false, reason: "base URL local, no se envía", submitted: 0, skipped };
  }

  let host: string;
  try {
    host = new URL(base).host;
  } catch {
    return { ok: false, reason: "NEXT_PUBLIC_BASE_URL inválida", submitted: 0, skipped };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: KEY,
        keyLocation: `${base}${KEY_PATH}`,
        urlList: urlList.slice(0, MAX_URLS_PER_REQUEST),
      }),
      // Sin esto, un endpoint colgado deja pendiente el request que lo disparó.
      signal: AbortSignal.timeout(10_000),
    });

    // 200 y 202 son ambos éxito según el protocolo (202 = aceptado, clave
    // todavía en validación).
    if (res.status !== 200 && res.status !== 202) {
      return { ok: false, reason: `IndexNow respondió ${res.status}`, submitted: 0, skipped };
    }
    return { ok: true, submitted: Math.min(urlList.length, MAX_URLS_PER_REQUEST), skipped };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "error desconocido";
    return { ok: false, reason, submitted: 0, skipped };
  }
}
