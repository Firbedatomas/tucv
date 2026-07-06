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
  const nInteresados =
    input.interestCount > 0
      ? `ya hay ${input.interestCount} persona${input.interestCount > 1 ? "s" : ""} de ${zona} interesada${input.interestCount > 1 ? "s" : ""} en trabajar con ustedes`
      : `podemos conectarlos con candidatos de ${zona}`;

  // gmaps: NO les consta que estén contratando -> el gancho es la DEMANDA
  // ("hay gente que quiere trabajar acá"), no un aviso que no vimos. Para fuentes
  // donde SÍ publicaron (web/IG con "trabajá con nosotros") sí mencionamos eso.
  const contexto =
    input.sourceType === "gmaps"
      ? `Los encontramos en Google Maps y armamos una página gratis para su negocio, y ${nInteresados}`
      : `Los vimos en ${src}${input.roleExample && input.roleExample !== "Sumate al equipo" ? ` buscando ${input.roleExample}` : ""} y armamos una página gratis para su búsqueda, y ${nInteresados}`;

  return (
    `Hola! Somos TuCV (tucv.ar), la app de empleo local. ` +
    `${contexto}. ` +
    `¿Quieren ver los candidatos? Reclaman la cuenta gratis en 1 minuto 👉 ${claimUrl}\n\n` +
    `(Si prefieren no aparecer, avísennos y la damos de baja.)`
  );
}
