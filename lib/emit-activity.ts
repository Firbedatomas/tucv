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

// Cierre del embudo de atribución: se llama cuando alguien CONVIERTE
// (candidate_registered / application_sent / company_registered). El server lee
// la cookie tucv_ref y, si vino de un share, acredita la conversión a ese canal.
// Fire-and-forget; la cookie viaja sola con el fetch (mismo origen).
export function emitConversion(event: "candidate_registered" | "application_sent" | "company_registered"): void {
  try {
    fetch("/api/attribution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // no-op
  }
}
