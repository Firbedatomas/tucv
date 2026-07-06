// Arma el mensaje de outreach a una empresa detectada. El gancho es el interés
// REAL de candidatos ("ya tenés X interesados"), con transparencia sobre de
// dónde salió y una baja fácil. NUNCA dice ser la empresa. El link lleva al
// reclamo (/e/[slug]/reclamar).
const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

const SOURCE_PHRASE: Record<string, string> = {
  website: "su web",
  gmaps: "Google Maps",
  instagram: "su Instagram",
  facebook: "su Facebook",
  google_jobs: "un aviso público",
  camara: "la cámara de comercio",
  municipio: "una bolsa de empleo",
  otro: "una fuente pública",
};

export function buildOutreachMessage(input: {
  slug: string;
  cityZone: string;
  sourceType: string;
  interestCount: number;
  roleExample?: string;
}): string {
  const claimUrl = `${BASE}/e/${input.slug}/reclamar`;
  const src = SOURCE_PHRASE[input.sourceType] || "una publicación pública";
  const zona = input.cityZone || "tu zona";
  const gancho =
    input.interestCount > 0
      ? `y ya hay ${input.interestCount} persona${input.interestCount > 1 ? "s" : ""} de ${zona} interesada${input.interestCount > 1 ? "s" : ""}`
      : "para conectarlos con candidatos de la zona";

  return (
    `Hola! Somos TuCV (tucv.ar), la app de empleo local. ` +
    `Los vimos en ${src}${input.roleExample ? ` buscando ${input.roleExample}` : ""} y armamos una página gratis para su búsqueda ${gancho}. ` +
    `¿Quieren ver los candidatos? Reclaman la cuenta gratis en 1 minuto 👉 ${claimUrl}\n\n` +
    `(Si prefieren no aparecer, avísennos y la damos de baja.)`
  );
}
