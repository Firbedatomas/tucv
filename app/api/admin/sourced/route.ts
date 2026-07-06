import "server-only";
import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { slugify, generateShortCode } from "@/lib/slug";

const SOURCE_TYPES = ["website", "gmaps", "instagram", "facebook", "google_jobs", "camara", "municipio", "otro"];

// Alta de una empresa detectada + sus búsquedas (siembra semi-manual del piloto).
// Solo admin. Genera public_slug únicos. Todos los textos van acotados por el
// schema de PocketBase (max por campo); acá trimeamos y validamos lo básico.
export async function POST(req: Request) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const name = ((body?.name as string) || "").trim();
  if (!name) return NextResponse.json({ error: "Falta el nombre." }, { status: 400 });

  const sourceType = SOURCE_TYPES.includes(body?.sourceType) ? body.sourceType : "otro";
  const searches = Array.isArray(body?.searches) ? body.searches : [];

  const admin = await pbAdmin();
  const slug = `${slugify(name).slice(0, 60) || "empresa"}-${generateShortCode().slice(0, 5)}`;

  const biz = await admin.collection("sourced_businesses").create({
    name,
    rubro: ((body?.rubro as string) || "").trim(),
    city_zone: ((body?.cityZone as string) || "").trim(),
    address: ((body?.address as string) || "").trim(),
    contact_phone: ((body?.contactPhone as string) || "").trim(),
    contact_email: ((body?.contactEmail as string) || "").trim(),
    instagram: ((body?.instagram as string) || "").trim(),
    website: ((body?.website as string) || "").trim(),
    source_type: sourceType,
    source_url: ((body?.sourceUrl as string) || "").trim(),
    evidence: ((body?.evidence as string) || "").trim(),
    region: ((body?.region as string) || "cordoba").trim(),
    status: "detected",
    public_slug: slug,
    notes: ((body?.notes as string) || "").trim(),
  });

  let created = 0;
  for (const s of searches) {
    const role = ((s?.role as string) || "").trim();
    if (!role) continue;
    await admin
      .collection("sourced_jobs")
      .create({
        sourced_business: biz.id,
        role,
        rubro: ((s?.rubro as string) || (body?.rubro as string) || "").trim(),
        description_snippet: ((s?.snippet as string) || "").trim(),
        source_url: ((s?.sourceUrl as string) || (body?.sourceUrl as string) || "").trim(),
        status: "detected",
        public_slug: `${slugify(role).slice(0, 60) || "busqueda"}-${generateShortCode().slice(0, 5)}`,
      })
      .then(() => (created += 1))
      .catch(() => {});
  }

  return NextResponse.json({ ok: true, id: biz.id, slug, searches: created });
}
