// Extrae un email de contacto del HTML del sitio de un negocio.
//
// Por qué hace falta: la API de Google Places NO devuelve email -- no existe
// el campo. Medido el 2026-07-25: de 950 negocios capturados por Places, 0
// tenían email y 650 tenían sitio web. El sitio propio es la única fuente de
// email a escala, y es información que el negocio publica a propósito para que
// lo contacten.
//
// Todo acá es puro y testeado: la parte de red (bajar el HTML) vive en el
// script que la usa.

// Direcciones que no sirven para contactar a un negocio.
const BASURA = [
  /^[^@]*@(sentry|wix|squarespace|godaddy|shopify|tiendanube|mercadolibre)\./i,
  /^(no-?reply|noreply|donotreply|postmaster|abuse|webmaster|hostmaster)@/i,
  /@(example|ejemplo|test|prueba|localhost|domain|dominio|email|correo|sentry)\./i,
  /@(tuempresa|tunegocio|midominio|yourdomain|yoursite)\./i,
  /\.(png|jpg|jpeg|gif|webp|svg|css|js)$/i,
  /^[0-9a-f]{16,}@/i, // hashes que a veces quedan en el HTML
];

// Casillas gratuitas: un comercio chico usa gmail y lo pone en su propio sitio.
// Son las únicas de OTRO dominio que se aceptan -- ver la nota en extraerEmail.
const PROVEEDORES_PERSONALES = new Set([
  "gmail.com",
  "hotmail.com",
  "hotmail.com.ar",
  "outlook.com",
  "outlook.com.ar",
  "yahoo.com",
  "yahoo.com.ar",
  "live.com",
  "live.com.ar",
  "icloud.com",
  "fibertel.com.ar",
  "speedy.com.ar",
]);

// Prefijos que sí son de contacto real, en orden de preferencia: si un sitio
// tiene varios, queremos el que lee una persona.
const PREFERIDOS = ["contacto", "info", "hola", "consultas", "ventas", "administracion", "rrhh", "empleo"];

export function esEmailUtil(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(e)) return false;
  if (e.length > 120) return false;
  return !BASURA.some((re) => re.test(e));
}

/**
 * Devuelve el mejor email de contacto encontrado en el HTML, o null.
 *
 * Prioriza, en este orden:
 *   1. Un `mailto:` (es una invitación explícita a escribir).
 *   2. Un prefijo de contacto conocido (contacto@, info@, hola@...).
 *   3. Cualquier email del mismo dominio que el sitio.
 *
 * `dominio` es opcional; sirve para descartar emails de terceros que
 * aparecen en el pie de página (el estudio que hizo la web, por ejemplo).
 */
export function extraerEmail(html: string, dominio?: string): string | null {
  if (!html) return null;

  const candidatos: string[] = [];

  // 1. mailto:
  for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) {
    const e = decodeURIComponent(m[1]).trim().toLowerCase();
    if (esEmailUtil(e)) candidatos.push(e);
  }

  // 2. Emails sueltos en el texto.
  for (const m of html.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
    const e = m[0].trim().toLowerCase();
    if (esEmailUtil(e)) candidatos.push(e);
  }

  if (!candidatos.length) return null;

  const unicos = [...new Set(candidatos)];
  const host = (dominio || "").toLowerCase().replace(/^www\./, "");

  const puntaje = (e: string): number => {
    let p = 0;
    const [usuario, dom] = e.split("@");
    if (host && dom.replace(/^www\./, "").endsWith(host)) p += 10;
    if (PREFERIDOS.includes(usuario)) p += 5;
    // Un mailto pesa más que una mención suelta.
    if (html.toLowerCase().includes(`mailto:${e}`)) p += 3;
    return p;
  };

  // Con el dominio conocido, solo se aceptan dos cosas:
  //   - emails del mismo dominio (contacto@panaderia.com.ar)
  //   - casillas gratuitas (panaderia@gmail.com), que es lo que usa medio
  //     comercio de barrio en su propio sitio
  //
  // Cualquier otro dominio se descarta. Antes se aceptaba "el mejor
  // disponible" y eso dejaba pasar el mail del proveedor que hizo la web:
  // en una muestra real (2026-07-25) entraron support@starapps.studio para un
  // local de indumentaria y reservas@sofitel.com para un restaurante.
  const aceptable = (e: string): boolean => {
    const dom = e.split("@")[1].replace(/^www\./, "");
    if (host && dom.endsWith(host)) return true;
    return PROVEEDORES_PERSONALES.has(dom);
  };

  const pool = host ? unicos.filter(aceptable) : unicos;
  if (!pool.length) return null;

  return pool.sort((a, b) => puntaje(b) - puntaje(a))[0] ?? null;
}
