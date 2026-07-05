import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveOwnerBusiness } from "@/lib/business-session";
import { calculateAge } from "@/lib/age";

const PUBLIC_POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8092";
function fileUrl(collectionId: string, recordId: string, filename: string): string {
  return `${PUBLIC_POCKETBASE_URL}/api/files/${collectionId}/${recordId}/${filename}`;
}

// Búsqueda proactiva de candidatos para EMPRESAS, servida server-side con
// proyección segura. Reemplaza el `pb().collection("candidate_profiles").
// getFullList(...)` que hacía el cliente: ese camino filtraba por listRule y,
// como PocketBase no restringe por campo, mandaba whatsapp / fecha de
// nacimiento / cv_file / edit_token de TODOS los candidatos visibles a
// CUALQUIER usuario autenticado. Acá:
//  - solo responde a una empresa DUEÑA (resolveOwnerBusiness),
//  - NUNCA incluye whatsapp (se revela aparte, tras consentimiento/aceptación),
//  - manda la EDAD derivada, nunca birth_date,
//  - quita datos de contacto de terceros de category_experience.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await resolveOwnerBusiness(token);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = await pbAdmin();
    const rows = await admin
      .collection("candidate_profiles")
      .getFullList({ filter: "consent_zone_visible = true", sort: "-created", requestKey: null });

    const candidates = rows.map((r) => {
      const exp = Array.isArray(r.category_experience)
        ? (r.category_experience as Record<string, unknown>[]).map((e) => ({
            category: e.category,
            experience: e.experience,
            company: e.company,
            company_id: e.company_id,
            start_year: e.start_year,
            end_year: e.end_year,
            is_current: e.is_current,
          }))
        : [];
      return {
        id: r.id,
        name: r.name,
        city_zone: r.city_zone,
        city: r.city ?? "",
        province: r.province ?? "",
        age: calculateAge(r.birth_date as string, r.age_manual as number),
        categories: r.categories ?? [],
        category_other: r.category_other ?? "",
        category_experience: exp,
        availability: r.availability ?? [],
        experience: r.experience ?? "",
        references: r.references ?? null,
        references_text: r.references_text ?? "",
        studies: r.studies ?? null,
        bio: r.bio ?? "",
        has_own_transport: r.has_own_transport ?? "",
        immediate_availability: Boolean(r.immediate_availability),
        expected_salary: r.expected_salary ?? "",
        photoUrl: r.photo ? fileUrl(r.collectionId, r.id, r.photo as string) : null,
        cvUrl: r.cv_file ? fileUrl(r.collectionId, r.id, r.cv_file as string) : null,
        consent_contact: Boolean(r.consent_contact),
        updated: r.updated,
        // whatsapp: NUNCA acá — se revela por /api/contact-requests/reveal.
      };
    });

    return NextResponse.json({ candidates });
  } catch {
    return NextResponse.json({ candidates: [] }, { status: 200 });
  }
}
