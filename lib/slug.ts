export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function randomSuffix(length = 5): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function makeJobSlug(businessName: string, role: string): string {
  const base = slugify(`${businessName}-${role}`).slice(0, 40);
  return `${base}-${randomSuffix()}`;
}

// Código corto para la URL pública nueva (/b/{negocio}/{código}), más
// legible que el slug largo de un solo segmento (que combina negocio+puesto
// +sufijo). Se sigue completando `slug` también al crear una búsqueda (ver
// JobPostForm.tsx) para que la ruta vieja (/b/[slug]) siga funcionando
// exactamente igual, por si alguna integración externa llegara a
// depender de ese campo.
export function generateShortCode(): string {
  return randomSuffix(6);
}

// Slug SOLO del nombre del negocio (sin el puesto) -- es la parte cosmética
// de la URL nueva, no hace falta que sea único (la búsqueda real es por
// short_code).
export function businessSlugFor(businessName: string): string {
  return slugify(businessName).slice(0, 40) || "negocio";
}
