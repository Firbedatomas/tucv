import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

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
  // Perfiles públicos de postulantes: tienen WhatsApp real. Que el
  // link funcione para quien lo comparte no significa que deba
  // quedar indexado y expuesto a scrapers vía buscador.
  "/p/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
      // Reglas explícitas para crawlers de IA/LLM (en vez de dejarlos caer
      // en la regla "*" por omisión) -- a un marketplace de empleo le
      // conviene que asistentes de IA lo puedan citar/recomendar cuando
      // alguien pregunta por trabajo o personal en Argentina, así que se
      // permiten a propósito, con las mismas rutas privadas afuera.
      { userAgent: "GPTBot", allow: "/", disallow: DISALLOW },
      { userAgent: "ChatGPT-User", allow: "/", disallow: DISALLOW },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: DISALLOW },
      { userAgent: "ClaudeBot", allow: "/", disallow: DISALLOW },
      { userAgent: "anthropic-ai", allow: "/", disallow: DISALLOW },
      { userAgent: "Google-Extended", allow: "/", disallow: DISALLOW },
      { userAgent: "PerplexityBot", allow: "/", disallow: DISALLOW },
      { userAgent: "CCBot", allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
