// Los números se cargan en formato local ("11 2233 4455", como pide el
// placeholder del form) pero wa.me exige el formato internacional
// completo. Argentina tiene una particularidad conocida: los celulares
// necesitan el "9" después del código de país (54) para que el link de
// WhatsApp funcione -- sin él, wa.me no encuentra el contacto. Sin esta
// normalización, CUALQUIER número cargado en el formato que el propio form
// sugiere ("11 2233 4455") generaba un link roto, y WhatsApp es el único
// canal de contacto de todo el producto.
function normalizeArgentinaWhatsApp(digits: string): string {
  let d = digits;
  if (d.startsWith("54")) {
    const rest = d.slice(2);
    return rest.startsWith("9") ? d : `549${rest}`;
  }
  // Número local: sacamos el "0" de larga distancia y el "15" de celular
  // si están (formato típico al dictar un número: "011 15-2233-4455").
  d = d.replace(/^0/, "");
  d = d.replace(/^(\d{2,4})15/, "$1");
  return `549${d}`;
}

export function waLink(phone: string, message?: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  const normalized = normalizeArgentinaWhatsApp(digits);
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${query}`;
}
