// Dispara un evento de actividad desde el cliente, best-effort. El server
// (/api/activity) valida el tipo y deriva zona/rubro del record real, así que
// acá solo mandamos el tipo y un id. keepalive para que sobreviva si la página
// navega justo después (ej. redirect post-registro).
export function emitActivity(type: string, ids: { candidateId?: string; jobId?: string } = {}): void {
  try {
    fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...ids }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // no-op
  }
}
