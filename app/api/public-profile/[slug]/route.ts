import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";

// pbAdmin() usa la URL INTERNA de Docker (http://tucv-pb:8090) para hablar
// con PocketBase server-to-server -> nunca usar `client.files.getURL()` acá
// para algo que va al navegador, arma la URL con esa base interna que el
// browser no puede resolver. Los links de archivo van siempre con la URL
// pública.
const PUBLIC_POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8092";

function publicFileUrl(collectionId: string, recordId: string, filename: string): string {
  return `${PUBLIC_POCKETBASE_URL}/api/files/${collectionId}/${recordId}/${filename}`;
}

// Igual patrón que /api/public-job/[slug]: resuelve por slug server-side
// (superusuario) para no tener que abrir candidate_profiles.viewRule a
// cualquiera en internet. Esta ruta es la única puerta pública al perfil.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const client = await pbAdmin();
    const record = await client
      .collection("candidate_profiles")
      .getFirstListItem(client.filter("profile_slug = {:slug}", { slug }));

    const photoUrl = record.photo ? publicFileUrl(record.collectionId, record.id, record.photo) : null;
    const cvUrl = record.cv_file ? publicFileUrl(record.collectionId, record.id, record.cv_file) : null;

    return NextResponse.json({
      id: record.id,
      name: record.name,
      city_zone: record.city_zone,
      birth_date: record.birth_date,
      age_manual: record.age_manual ?? null,
      whatsapp: record.whatsapp,
      categories: record.categories,
      category_other: record.category_other,
      category_experience: record.category_experience,
      availability: record.availability,
      studies: record.studies,
      references: record.references,
      bio: record.bio,
      has_own_transport: record.has_own_transport ?? "",
      immediate_availability: Boolean(record.immediate_availability),
      expected_salary: record.expected_salary ?? "",
      photoUrl,
      cvUrl,
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
