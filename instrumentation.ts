// Next detecta este archivo solo (instrumentation estable desde Next 15).
// `onRequestError` recibe cualquier error NO capturado de rutas / RSC / SSR ->
// lo avisamos al admin por Telegram. Dedup + best-effort para no inundar ni
// romper nada (el error ya está pasando; esto es solo el aviso).
export async function onRequestError(
  err: unknown,
  request: { path?: string; method?: string },
  context?: { routePath?: string; routerKind?: string },
): Promise<void> {
  try {
    const { notifyTelegram, shouldNotifyError } = await import("@/lib/telegram");
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    if (!shouldNotifyError(message)) return;
    const where = request?.path || context?.routePath || "?";
    const stack = err instanceof Error && err.stack ? `\n${err.stack.split("\n").slice(1, 4).join("\n")}` : "";
    await notifyTelegram(`🐞 Error en la app\n${request?.method ?? ""} ${where}\n${message}${stack}`);
  } catch {
    // nunca dejamos que el reporte de error tire otro error.
  }
}
