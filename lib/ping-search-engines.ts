// Avisa a /api/search-ping que una búsqueda se publicó o cambió, para que le
// notifique a Bing (IndexNow) y a Google (Indexing API).
//
// Fire-and-forget a propósito, y con todo envuelto en catch: esto es una
// mejora de posicionamiento, NO una operación crítica. Si el endpoint falla,
// si un buscador está caído o si el navegador bloquea el request, publicar una
// búsqueda tiene que seguir funcionando exactamente igual. Nunca await-earlo
// en el camino del guardado.
export function pingSearchEngines(jobId: string): void {
  try {
    // keepalive: el usuario suele navegar al link de la búsqueda ni bien
    // guarda, y sin esto el request se cancela al desmontar la página.
    void fetch("/api/search-ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ni siquiera un throw sincrónico de fetch puede escalar acá.
  }
}
