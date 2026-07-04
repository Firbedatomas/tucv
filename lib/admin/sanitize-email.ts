import DOMPurify from "isomorphic-dompurify";

// El HTML de un correo entrante lo escribe un desconocido -- se renderiza
// con dangerouslySetInnerHTML en la sesión del admin (que tiene la cookie
// más sensible de todo el sitio), así que esto NO es opcional. A diferencia
// de sanitizeVisibleMessage (lib/sanitize-html.ts, pensado para el editor
// de "mensaje visible" de un aviso, con una whitelist muy chica) acá
// permitimos el HTML normal de un email (links, imágenes, tablas, listas)
// apoyándonos en la whitelist segura por default de DOMPurify, pero
// bloqueando explícitamente lo más peligroso y forzando que los links
// entrantes no puedan usar `window.opener` para phishing.
let hooksRegistered = false;
function ensureHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
}

export function sanitizeInboundEmailHtml(html: string): string {
  ensureHooks();
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "meta", "link"],
    FORBID_ATTR: ["srcset"],
  });
}
