const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Antes esto era app/robots.ts con MetadataRoute.Robots. Se pasó a route
// handler de texto plano porque el tipo de Next no permite emitir directivas
// que no conoce, y `Content-Signal` (estándar de Cloudflare) es una de ellas.
// El resto de la semántica es idéntica a la anterior.

// Mismas rutas privadas/sensibles para toda regla de abajo -- un solo lugar
// para no repetir la lista y que se desalinee con el tiempo.
const DISALLOW = [
  // Paneles privados: solo tienen sentido logueado, no aportan nada
  // indexados y exponer su estructura no suma.
  "/empresa/panel",
  "/empresa/perfil",
  "/empresa/busquedas/",
  "/empresa/candidatos",
  "/postulante/editar",
  // Perfiles públicos de postulantes: tienen WhatsApp real. Que el link
  // funcione para quien lo comparte no significa que deba quedar indexado y
  // expuesto a scrapers vía buscador.
  "/p/",
];

// Crawlers de IA/LLM permitidos a propósito (en vez de dejarlos caer en la
// regla "*"): a un marketplace de empleo le conviene que los asistentes lo
// puedan citar cuando alguien pregunta por trabajo o personal en Argentina.
const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "PerplexityBot",
  "CCBot",
];

// Content-Signal (Cloudflare): declara explícitamente para qué se puede usar
// el contenido, en vez de dejarlo a interpretación de cada crawler.
//   search    -> aparecer en resultados de búsqueda
//   ai-input  -> ser citado por un asistente al responder una pregunta
//   ai-train  -> usarse para entrenar modelos
// Los tres en `yes`: TuCV quiere ser citado y recomendado: la visibilidad es
// el producto. No hay contenido premium que proteger de un LLM acá.
const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

function bloque(userAgent: string): string {
  const lineas = [`User-Agent: ${userAgent}`, `Content-Signal: ${CONTENT_SIGNAL}`, "Allow: /"];
  for (const ruta of DISALLOW) lineas.push(`Disallow: ${ruta}`);
  return lineas.join("\n");
}

export function GET(): Response {
  const cuerpo = [...[["*"], AI_BOTS].flat().map(bloque), `Sitemap: ${BASE_URL}/sitemap.xml`].join("\n\n") + "\n";

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Length": String(new TextEncoder().encode(cuerpo).byteLength),
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
