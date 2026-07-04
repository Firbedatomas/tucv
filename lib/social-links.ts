// El campo "Instagram" acepta cualquier cosa que la persona escriba
// (@handle, instagram.com/handle, un link completo) -- esto lo normaliza a
// una URL clickeable sin forzar un formato específico al cargar el dato.
export function instagramUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^instagram\.com\//i.test(trimmed)) return `https://${trimmed}`;
  const handle = trimmed.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}

export function websiteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function websiteLabel(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
