// Detección de cadenas para la siembra de empresas (lib/places-capture.ts).
//
// Google Places devuelve primero lo más prominente, así que una búsqueda de
// "cafetería en Córdoba" trae antes a Starbucks y Juan Valdez que a la
// cafetería del barrio. El resultado medido el 2026-07-24: de los negocios
// sembrados que tenían candidatos interesados, la mayoría eran cadenas --
// YPF, Coto, Topper, Kevingston, Smart Fit, Juan Valdez.
//
// El cliente de TuCV es el comercio o la pyme local: el dueño que necesita
// cubrir un puesto esta semana y decide solo. Una cadena nacional tiene RRHH
// centralizado y no va a reclamar un perfil en TuCV -- sembrarla gasta cuota
// de la API, ensucia la cola de captación y nunca convierte.

/** Normaliza para comparar: sin acentos, sin puntuación, minúsculas. */
export function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Marcas con presencia nacional/multinacional. La lista se compara por
// palabra completa contra el nombre normalizado, no por substring suelto:
// "dia" como substring matchearía "Diagonal", "Mediodía" o "Radial.
const CADENAS: readonly string[] = [
  // Combustible
  "ypf", "shell", "axion", "puma energy", "gulf",
  // Supermercados y mayoristas
  "coto", "carrefour", "jumbo", "disco", "vea", "walmart", "changomas", "libertad",
  "dia", "makro", "vital", "supermayorista vital", "diarco", "maxiconsumo", "la anonima",
  // Farmacias
  "farmacity", "farmatodo", "dr ahorro", "farmacias del pueblo",
  // Gastronomía
  "mcdonald s", "mcdonalds", "burger king", "starbucks", "subway", "mostaza", "wendy s",
  "havanna", "bonafide", "juan valdez", "the coffee store", "grido", "freddo",
  "dean dennys", "kentucky", "ugis", "el noble", "tienda de cafe", "cafe martinez",
  // Indumentaria y deporte
  "topper", "kevingston", "adidas", "nike", "puma", "reebok", "levi s", "zara",
  "47 street", "cheeky", "mimo", "prune", "vitamina", "akiabara", "rapsodia",
  "montagne", "dexter", "sportline", "stock center", "solo deportes", "grimoldi",
  // Gimnasios
  "smart fit", "megatlon", "sportclub", "always",
  // Electro, hogar, otros
  "fravega", "garbarino", "musimundo", "naldo", "cetrogar", "easy", "sodimac",
  "pinturerias rex", "sherwin williams", "openfarma",
  // Bancos y servicios (aparecen en búsquedas de "atención al cliente")
  "banco nacion", "banco provincia", "banco galicia", "santander", "bbva", "macro",
  "brubank", "mercado pago", "rapipago", "pago facil", "western union",
  // Telefonía / correo
  "personal", "movistar", "claro", "correo argentino", "oca", "andreani",
];

/**
 * ¿El nombre corresponde a una cadena conocida?
 *
 * Compara por palabra completa contra el nombre normalizado, así que
 * "Bonafide Villa Allende" da true (es una sucursal) pero "Diagonal Norte" no
 * matchea "dia".
 */
export function esCadenaConocida(nombre: string): boolean {
  const n = normalizarNombre(nombre);
  if (!n) return false;
  const palabras = n.split(" ");

  for (const cadena of CADENAS) {
    const partes = cadena.split(" ");
    if (partes.length === 1) {
      if (palabras.includes(partes[0])) return true;
      continue;
    }
    // Marca de varias palabras: tiene que aparecer la secuencia completa.
    for (let i = 0; i + partes.length <= palabras.length; i++) {
      if (partes.every((p, j) => palabras[i + j] === p)) return true;
    }
  }
  return false;
}
