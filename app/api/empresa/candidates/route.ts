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

    // Fase 2: experiencias y tareas relacionales, en 2 queries batch (no N+1) y
    // agrupadas por candidato. Alimentan el matching por rubro/puesto/tarea y la
    // línea de tiempo del panel (Fase 3). Best-effort: si fallan, se cae al
    // modelo viejo (category_experience) sin romper.
    const cweRows = await admin
      .collection("candidate_work_experiences")
      .getFullList({ sort: "sort_order", requestKey: null })
      .catch(() => [] as Record<string, unknown>[]);
    const cetRows = await admin
      .collection("candidate_experience_tasks")
      .getFullList({ requestKey: null })
      .catch(() => [] as Record<string, unknown>[]);
    const expsByCand: Record<string, Record<string, unknown>[]> = {};
    for (const e of cweRows) (expsByCand[e.candidate_profile as string] ??= []).push(e);
    const tasksByCand: Record<string, string[]> = {};
    for (const t of cetRows) (tasksByCand[t.candidate_profile as string] ??= []).push(t.task as string);
    const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));

    const candidates = rows.map((r) => {
      const exps = expsByCand[r.id] || [];
      const workExperiences = exps.map((e) => ({
        job_title: e.job_title ?? "",
        category: e.category ?? "",
        company_name: e.company_name ?? "",
        city: e.city ?? "",
        start_year: e.start_year ?? null,
        start_month: e.start_month ?? null,
        end_year: e.end_year ?? null,
        end_month: e.end_month ?? null,
        currently_working: Boolean(e.currently_working),
        description: e.description ?? "",
      }));
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
        // --- Modelo laboral relacional (Fase 2) ---
        work_experiences: workExperiences,
        experience_categories: uniq(exps.map((e) => e.category as string)),
        experience_roles: uniq(exps.map((e) => e.job_title as string)),
        experience_tasks: uniq(tasksByCand[r.id] || []),
        total_experience_months: (r.total_experience_months as number) ?? 0,
        work_experience_count: (r.work_experience_count as number) ?? exps.length,
        dominant_categories: (r.dominant_categories as string[]) ?? [],
        latest_job_title: (r.latest_job_title as string) ?? "",
        has_current_job: Boolean(r.has_current_job),
      };
    });

    return NextResponse.json({ candidates });
  } catch {
    return NextResponse.json({ candidates: [] }, { status: 200 });
  }
}
