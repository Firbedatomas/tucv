// Valida un parámetro `?next=` para que solo pueda ser un path INTERNO seguro
// (mismo origen), nunca un redirect externo. Se usa en el flujo empresa: tras
// login/registro se vuelve a `next` (ej. el formulario de crear búsqueda que
// se empezó sin cuenta). Un `startsWith("/")` NO alcanza: `//evil.com` y
// `/\evil.com` empiezan con "/" pero son protocolo-relativos -> el browser
// navega afuera. Acá bloqueamos todas esas variantes (incluidas las encoded).
//
// Devuelve el path si es seguro, o `fallback` si no. NUNCA devuelve algo que
// pueda salir del origen.
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/empresa/panel",
): string {
  if (!raw || typeof raw !== "string") return fallback;

  // Decodificar (hasta 2 veces) para atrapar trucos encoded como %2F%2Fevil,
  // %5C (backslash), %09/%0A (control). Si el decode falla, es sospechoso.
  let s = raw;
  try {
    for (let i = 0; i < 2 && /%[0-9a-fA-F]{2}/.test(s); i++) s = decodeURIComponent(s);
  } catch {
    return fallback;
  }
  s = s.trim();

  // Rechazar cualquier carácter de control (0x00-0x1f, 0x7f): un \t o \n
  // metido en el medio puede confundir a parsers/navegadores.
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return fallback;
  }

  // Tiene que ser un path absoluto de un solo slash inicial, sin variantes que
  // el browser interprete como otro origen.
  if (!s.startsWith("/")) return fallback; // relativo o con esquema (http:, javascript:, data:...)
  if (s.startsWith("//")) return fallback; // protocolo-relativo -> externo
  if (s[1] === "\\" || s[1] === "/") return fallback; // "/\evil", "//"
  if (s.includes("\\")) return fallback; // cualquier backslash (Windows/UNC tricks)
  if (/^\/[^/?#]*:/.test(s)) return fallback; // algo tipo "/foo:bar" que huela a esquema

  return s;
}
