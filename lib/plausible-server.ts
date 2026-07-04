import "server-only";

const PLAUSIBLE_BASE_URL = process.env.PLAUSIBLE_BASE_URL || "https://analytics.tucv.ar";
const PLAUSIBLE_SITE_ID = process.env.PLAUSIBLE_SITE_ID || "tucv.ar";

// Para eventos que pasan del lado del servidor (ej. el webhook de Mercado
// Pago, que no tiene navegador/sesión de quien paga) -- misma idea que
// trackEvent en lib/track.ts pero vía la Events API HTTP de Plausible en vez
// del script del navegador.
export async function trackServerEvent(
  name: string,
  props?: Record<string, string | number | boolean>
): Promise<void> {
  try {
    await fetch(`${PLAUSIBLE_BASE_URL}/api/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // La Events API de Plausible descarta requests sin User-Agent.
        "User-Agent": "TuCV-server/1.0",
      },
      body: JSON.stringify({
        name,
        url: `https://${PLAUSIBLE_SITE_ID}/server-event`,
        domain: PLAUSIBLE_SITE_ID,
        props,
      }),
    });
  } catch {
    // Best-effort: nunca dejamos que un error de analítica rompa el webhook
    // real de Mercado Pago.
  }
}
