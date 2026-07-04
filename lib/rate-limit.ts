import "server-only";

// Rate limit genérico en memoria (fixed-window) para las rutas API de la capa
// de interacción: referencias, recomendaciones, contacto, reportes. Es
// por-proceso (se resetea en cada redeploy), suficiente como freno de abuso
// para el volumen de un mercado local -- no pretende ser un límite distribuido.
// Se keyea por acción + identificador (IP, userId o token) para poder combinar
// "N por IP" y "N por usuario" en el mismo endpoint.
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

// Poda perezosa: cada tanto barremos entradas vencidas para que el Map no
// crezca sin techo bajo tráfico de IPs variadas.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) {
    if (b.resetAt <= now) store.delete(k);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

export function checkRateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = opts.now ?? Date.now();
  sweep(now);
  const bucket = store.get(opts.key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (bucket.count >= opts.limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// IP del cliente detrás de Caddy (setea x-forwarded-for). Tomamos la primera
// (el cliente real), con fallback a x-real-ip. "unknown" si no hay -> igual
// entra al límite bajo esa clave común, no lo saltea.
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Chequea varios límites a la vez (ej. por IP y por token) y devuelve el primero
// que se pase. Útil para "N por IP Y M por token" en un mismo submit.
export function checkRateLimits(
  checks: Array<{ key: string; limit: number; windowMs: number }>,
  now = Date.now(),
): RateLimitResult {
  for (const c of checks) {
    const r = checkRateLimit({ ...c, now });
    if (!r.allowed) return r;
  }
  return { allowed: true, retryAfterMs: 0 };
}
