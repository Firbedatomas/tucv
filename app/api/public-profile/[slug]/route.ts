import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { calculateAge } from "@/lib/age";

// Subcampos de category_experience que NO deben salir en público: teléfono/
// nombre de un TERCERO (el referente) y la dirección del empleador anterior.
type RawExp = Record<string, unknown>;
function publicSafeExperience(list: unknown): RawExp[] {
  if (!Array.isArray(list)) return [];
  return list.map((e) => {
    const x = (e ?? {}) as RawExp;
    return {
      category: x.category,
      experience: x.experience,
      company: x.company,
      company_id: x.company_id,
      start_year: x.start_year,
      end_year: x.end_year,
      is_current: x.is_current,
    };
  });
}

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

    // Fase 3B: experiencias y estudios RELACIONALES + cache. Con fallback: si el
    // candidato todavía no tiene experiencias nuevas, work_experiences/education
    // vienen vacíos y la UI cae a category_experience/studies viejos. Sin datos
    // de referentes (el modelo nuevo no los guarda), así que son públicos-seguros.
    const [expRows, taskRows, eduRows] = await Promise.all([
      client.collection("candidate_work_experiences").getFullList({ filter: client.filter("candidate_profile = {:id}", { id: record.id }), sort: "sort_order,-start_year", requestKey: null }).catch(() => []),
      client.collection("candidate_experience_tasks").getFullList({ filter: client.filter("candidate_profile = {:id}", { id: record.id }), requestKey: null }).catch(() => []),
      client.collection("candidate_education").getFullList({ filter: client.filter("candidate_profile = {:id}", { id: record.id }), sort: "-end_year,-start_year", requestKey: null }).catch(() => []),
    ]);
    const tasksByExp: Record<string, string[]> = {};
    for (const t of taskRows) (tasksByExp[t.experience as string] ??= []).push(t.task as string);
    const work_experiences = expRows.map((e) => ({
      job_title: e.job_title ?? "", category: e.category ?? "", company_name: e.company_name ?? "", city: e.city ?? "",
      start_year: e.start_year ?? null, start_month: e.start_month ?? null, end_year: e.end_year ?? null, end_month: e.end_month ?? null,
      currently_working: Boolean(e.currently_working), description: e.description ?? "", tasks: tasksByExp[e.id] ?? [],
    }));
    const education = eduRows.map((s) => ({
      title: s.title ?? "", kind: s.kind ?? "", institution: s.institution ?? "", level: s.level ?? "", status: s.status ?? "",
      start_year: s.start_year ?? null, end_year: s.end_year ?? null,
    }));

    return NextResponse.json({
      id: record.id,
      name: record.name,
      city_zone: record.city_zone,
      // Nunca la fecha de nacimiento completa en público (Ley 25.326): solo la
      // edad derivada. El slug es adivinable y el endpoint no exige auth.
      age: calculateAge(record.birth_date as string, record.age_manual as number),
      whatsapp: record.whatsapp,
      categories: record.categories,
      category_other: record.category_other,
      category_experience: publicSafeExperience(record.category_experience),
      availability: record.availability,
      studies: record.studies,
      references: record.references,
      bio: record.bio,
      has_own_transport: record.has_own_transport ?? "",
      immediate_availability: Boolean(record.immediate_availability),
      expected_salary: record.expected_salary ?? "",
      photoUrl,
      cvUrl,
      // Modelo relacional (Fase 3B) + cache para el resumen compacto.
      work_experiences,
      education,
      total_experience_months: (record.total_experience_months as number) ?? 0,
      work_experience_count: (record.work_experience_count as number) ?? 0,
      dominant_categories: (record.dominant_categories as string[]) ?? [],
      dominant_tasks: (record.dominant_tasks as string[]) ?? [],
      latest_job_title: (record.latest_job_title as string) ?? "",
      has_current_job: Boolean(record.has_current_job),
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
