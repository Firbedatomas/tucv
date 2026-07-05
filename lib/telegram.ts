import "server-only";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Aviso best-effort al admin por Telegram (bot @Tucvar_bot). Nunca tira: si
// falta config o falla la red, se traga (mismo criterio que trackServerEvent en
// lib/plausible-server.ts). Texto plano (sin parse_mode) para no tener que
// escapar nombres de negocio / puestos con caracteres especiales.
export async function notifyTelegram(text: string): Promise<void> {
  if (!TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text.slice(0, 3900), // límite de Telegram: 4096 chars
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // best-effort: un aviso perdido no debe afectar la request que lo disparó.
  }
}

// Anti-spam para errores: un mismo error repetido (ej. una ruta rota golpeada
// mil veces) no debe inundar el chat. Solo avisamos una vez por mensaje dentro
// de una ventana. Estado en memoria del proceso Next (server de larga vida).
const recentErrors = new Map<string, number>();
const ERROR_WINDOW_MS = 10 * 60 * 1000;

export function shouldNotifyError(message: string): boolean {
  const now = Date.now();
  for (const [k, t] of recentErrors) {
    if (now - t > ERROR_WINDOW_MS) recentErrors.delete(k);
  }
  const key = message.slice(0, 200);
  if (recentErrors.has(key)) return false;
  recentErrors.set(key, now);
  return true;
}
