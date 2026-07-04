import "server-only";

// El local-part del destinatario ES la sección -- hola@tucv.ar, soporte@tucv.ar,
// etc. No hace falta una lista de secciones válidas de antemano: cualquier
// dirección @tucv.ar que Resend reciba abre su propia sección sola.
export function sectionFromAddress(address: string): string {
  const local = address.split("@")[0]?.trim().toLowerCase();
  return local || "otros";
}

export function parseFromHeader(from: string): { name: string; email: string } {
  const match = from.match(/^(.*)<(.+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim().toLowerCase() };
  }
  return { name: "", email: from.trim().toLowerCase() };
}
