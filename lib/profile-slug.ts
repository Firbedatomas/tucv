export function slugifyName(firstName: string, lastName: string): string {
  const raw = `${firstName} ${lastName}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || "postulante";
}

// El chequeo de disponibilidad corre server-side (/api/suggest-profile-slug,
// con pbAdmin()) porque candidate_profiles.listRule no permite consultas
// públicas anónimas -- no queremos abrir esa colección a listados públicos
// solo para poder chequear un slug.
export async function suggestAvailableSlug(
  firstName: string,
  lastName: string,
  excludeId?: string,
): Promise<string> {
  const base = slugifyName(firstName, lastName);
  try {
    const params = new URLSearchParams({ base });
    if (excludeId) params.set("excludeId", excludeId);
    const res = await fetch(`/api/suggest-profile-slug?${params.toString()}`);
    if (!res.ok) return base;
    const data = await res.json();
    return data.slug || base;
  } catch {
    return base;
  }
}
