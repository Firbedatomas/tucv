import DOMPurify from "isomorphic-dompurify";

// Único punto de sanitizado para HTML generado por el editor de texto
// enriquecido (Mensaje visible) -- se llama tanto al guardar (defensa en
// profundidad, por si alguien manda el request directo a PocketBase
// saltándose el formulario) como al mostrar en la página pública (nunca
// confiamos en lo que ya está guardado, pudo haberse guardado antes de
// este sanitizado o por otro camino). Tiene que correr igual en el
// servidor (Server Component de /b/[slug]) que en el navegador -- por eso
// todo el filtrado de "style" va por hooks de DOMPurify (que usa jsdom
// server-side) y no por manipular `document` directo, que no existe en
// Node.
const ALLOWED_TAGS = ["b", "strong", "u", "i", "em", "br", "div", "span", "p"];
// Nada de "position/background/url(...)" -- solo lo que el editor de
// Mensaje visible realmente genera (negrita/subrayado/tamaño/alineación).
// Filtra CADA declaración del atributo style por separado.
const ALLOWED_STYLE_PROP = /^(font-size|text-align|font-weight|text-decoration)$/;

let hooksRegistered = false;
function ensureHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName !== "style") return;
    const kept = data.attrValue
      .split(";")
      .map((decl) => decl.trim())
      .filter(Boolean)
      .filter((decl) => {
        const prop = decl.split(":")[0]?.trim().toLowerCase();
        return ALLOWED_STYLE_PROP.test(prop ?? "");
      });
    data.attrValue = kept.join("; ");
  });
}

export function sanitizeVisibleMessage(html: string): string {
  ensureHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["style"],
    ALLOWED_URI_REGEXP: /^$/, // ningún atributo acá debería llevar una URL
  });
}

export function htmlToPlainText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).trim();
}
